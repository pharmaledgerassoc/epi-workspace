export class GroupMember {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    setGroupMemberData() {
        this.username = this.element.getAttribute('data-username');
        this.userDID = this.element.getAttribute('data-userDID');
        this.groupName = this.element.getAttribute('data-groupName');
        this.groupDID = this.element.getAttribute('data-groupDID')
    }

    beforeRender() {
        this.setGroupMemberData();
    }

    afterRender() {
    }

    async openMemberPage(_target) {
        await webSkel.changeToDynamicPage('member-page', `member-page/` + encodeURIComponent(this.userDID), {
            username: this.username,
            userDID: this.userDID,
            groupName: this.groupName,
            groupDID: this.groupDID

        });
    }
}
