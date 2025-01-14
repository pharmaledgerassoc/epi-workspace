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
        let modal = await webSkel.showModal("member-info-modal", {
            title: "Member Info",
            username: this.username,
            userDID: this.userDID,
            groupName: this.groupName,
            groupDID: this.groupDID

        })
    }
}
