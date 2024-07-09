export class MessageToast{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.timeoutValue = this.element.getAttribute("data-timeout") || 1500;
        this.invalidate();
    }
    beforeRender(){
    }
    afterRender(){
        let closeButton = this.element.querySelector(".toast-close-button");
        closeButton.addEventListener("click", () => {
            if (this.element && this.element.parentElement) {
                this.element.remove();
            }
        })
        setTimeout(() => {
            if (this.element && this.element.parentElement) {
                this.element.remove();
            }
        }, this.timeoutValue)
    }
}