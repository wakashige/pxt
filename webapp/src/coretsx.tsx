import * as React from "react";
import * as ReactDOM from "react-dom";
import * as sui from "./sui";
import * as core from "./core";

export class CoreDialog extends React.Component<core.PromptOptions, {}> {

    public promise: Promise<any>;

    private resolve: any;
    private reject: any;

    constructor(props: core.PromptOptions) {
        super(props);
        this.state = {
        }

        this.hide = this.hide.bind(this);
        this.modalDidOpen = this.modalDidOpen.bind(this);
    }

    hide() {
        this.close();
    }

    close(result?: any) {
        this.setState({ visible: false });
        this.resolve(result);
    }

    componentDidMount() {
        this.promise = new Promise(
            (res, rej) => {
                this.resolve = res;
                this.reject = rej;
            }
        );

        // Enable copyable
        const btn = this.refs["copybtn"] as sui.Button;
        if (btn) {
            const btnDom = ReactDOM.findDOMNode(btn) as HTMLElement;
            btnDom.addEventListener('click', () => {
                try {
                    const inp = this.refs["linkinput"] as HTMLInputElement;
                    inp.focus();
                    inp.setSelectionRange(0, inp.value.length);
                    document.execCommand("copy");
                } catch (e) {
                }
            })
        }
    }

    modalDidOpen(ref: HTMLElement) {
        const options = this.props;
        if (options.onLoaded) {
            options.onLoaded(ref);
        }
    }

    render() {
        const options = this.props;
        const size: any = options.size || 'small';

        const buttons = options.buttons ? options.buttons.filter(b => !!b) : [];

        buttons.forEach(btn => {
            const onclick = btn.onclick;
            btn.onclick = () => {
                this.close(onclick ? onclick() : 0);
            }
            if (!btn.className) btn.className = "approve positive";
        })

        const classes = sui.cx([
            'coredialog',
            options.className
        ])

        /* tslint:disable:react-no-dangerous-html TODO(tslint): This needs to be reviewed with a security expert to allow for exception */
        return (
            <sui.Modal isOpen={true} ref="modal" className={classes}
                onClose={this.hide} size={size}
                defaultOpen={true} buttons={buttons}
                dimmer={true} closeIcon={options.hasCloseIcon}
                header={options.header}
                closeOnDimmerClick={!options.hideCancel}
                closeOnDocumentClick={!options.hideCancel}
                closeOnEscape={!options.hideCancel}
                modalDidOpen={this.modalDidOpen}
            >
                {options.type == 'prompt' ? <div className="ui fluid icon input">
                    <input autoFocus type="text" id="promptDialogInput" placeholder={options.defaultValue} />
                </div> : undefined}
                {options.jsx}
                {options.body ? <p>{options.body}</p> : undefined}
                {options.htmlBody ? <div dangerouslySetInnerHTML={{ __html: options.htmlBody }} /> : undefined}
                {options.input ? <div className="ui fluid action input">
                    <input className="userinput" spellCheck={false}
                        placeholder={`${options.input}`} type="text" />
                </div> : undefined}
                {options.copyable ? <div className="ui fluid action input">
                    <input ref="linkinput" className="linkinput" readOnly spellCheck={false} type="text" value={`${options.copyable}`} />
                    <sui.Button ref="copybtn" labelPosition='right' color="teal" className='copybtn' data-content={lf("Copied!")} />
                </div> : undefined}
            </sui.Modal >)
        /* tslint:enable:react-no-dangerous-html */
    }
}

let currentDialog: CoreDialog;

export function renderConfirmDialogAsync(options: core.PromptOptions): Promise<void> {
    return Promise.resolve()
        .delay(10)
        .then(() => {
            const wrapper = document.body.appendChild(document.createElement('div'));
            currentDialog = ReactDOM.render(React.createElement(CoreDialog, options), wrapper);

            function cleanup() {
                ReactDOM.unmountComponentAtNode(wrapper);
                setTimeout(() => {
                    wrapper.parentElement.removeChild(wrapper);
                })
            }
            return currentDialog.promise.finally(() => cleanup());
        });
}

export function hideDialog() {
    if (currentDialog) currentDialog.hide();
}

export interface LoadingDimmerProps {
}

export interface LoadingDimmerState {
    visible?: boolean;
    content?: string;
}

export class LoadingDimmer extends React.Component<LoadingDimmerProps, LoadingDimmerState> {

    constructor(props: LoadingDimmerProps) {
        super(props);
        this.state = {
            visible: true
        }
    }

    hide() {
        this.setState({ visible: false, content: undefined });
    }

    show(content: string) {
        this.setState({ visible: true, content: content });
    }

    isVisible() {
        return this.state.visible;
    }

    render() {
        const { visible, content } = this.state;
        if (!visible) return <div />;

        return <sui.Dimmer isOpen={true} active={visible} closable={false}>
            <sui.Loader className="large main msg no-select" aria-live="assertive">
                {content}
            </sui.Loader>
        </sui.Dimmer>;
    }
}


export interface NotificationOptions {
    kind?: string;
    text?: string;
    hc?: boolean;
}

export interface NotificationMessageState {
    notifications?: pxt.Map<NotificationOptions>;
}

export interface NotificationMessageProps {
}

export class NotificationMessages extends React.Component<NotificationMessageProps, NotificationMessageState> {

    constructor(props?: NotificationMessageProps) {
        super(props);
        this.state = {
            notifications: {}
        }
    }

    push(notification: NotificationOptions) {
        const notifications = this.state.notifications;
        const id = ts.pxtc.Util.guidGen();
        Object.keys(notifications).filter(e => notifications[e].kind == notification.kind)
            .forEach(previousNotification => this.remove(previousNotification));
        notifications[id] = notification;
        const that = this;
        // Show for 3 seconds before removing
        setTimeout(() => {
            that.remove(id);
        }, 3000);

        this.setState({ notifications: notifications });
    }

    remove(id: string) {
        const notifications = this.state.notifications;
        if (notifications[id]) {
            delete notifications[id];
            this.setState({ notifications: notifications });
        }
    }

    render() {
        const { notifications } = this.state;

        function renderNotification(id: string, notification: NotificationOptions) {
            const { kind, text, hc } = notification;
            let cls = 'ignored info message';
            switch (kind) {
                case 'err': cls = 'red inverted segment'; break;
                case 'warn': cls = 'orange inverted segment'; break;
                case 'info': cls = 'teal inverted segment'; break;
                case 'compile': cls = 'ignored info message'; break;
            }
            return <div key={`${id}`} id={`${kind}msg`} className={`ui ${hc} ${cls}`}>{text}</div>
        }

        return <div id="msg" aria-live="polite">
            {Object.keys(notifications).map(k => renderNotification(k, notifications[k]))}
        </div>;
    }
}

let notificationsInitialized = false;
let notificationMessages: NotificationMessages;

export function pushNotificationMessage(options: NotificationOptions): void {
    if (!notificationsInitialized) {
        notificationsInitialized = true;
        const wrapper = document.body.appendChild(document.createElement('div'));
        notificationMessages = ReactDOM.render(React.createElement(NotificationMessages, options), wrapper);
        notificationMessages.push(options);
    } else if (notificationMessages) {
        notificationMessages.push(options);
    }
}