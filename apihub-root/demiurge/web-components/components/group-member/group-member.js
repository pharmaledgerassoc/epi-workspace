export class GroupMember {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    setGroupMemberData() {
        this.username = this.element.getAttribute('data-username');
        this.userDID = this.element.getAttribute('data-userDID');
        this.group = this.element.getAttribute('data-group');
        this.groupDID = this.element.getAttribute('data-groupDID')
    }

    beforeRender() {
        this.setGroupMemberData();
    }

    afterRender() {
    }
    async openMemberPage(_target){
        await webSkel.changeToDynamicPage('member-page',`member-page?userDID=${this.userDID}`,{userDID: this.userDID});
    }


}