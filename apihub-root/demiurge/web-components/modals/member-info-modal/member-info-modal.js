export class MemberInfoModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {
        this.username = this.element.getAttribute('data-username');
        this.userDID = this.element.getAttribute('data-userDID');
        this.groupName = this.element.getAttribute('data-groupName');
        this.groupDID = this.element.getAttribute('data-groupDID')
    }

    afterRender() {
    }
}
