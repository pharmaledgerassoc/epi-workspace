import constants from "../../../constants.js";
import utils from "../../../utils.js";
import GroupsManager from "../../../services/GroupsManager.js";
import AppManager from "../../../services/AppManager.js";

export class GroupsPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.groupsManager = GroupsManager.getInstance();
        this.appManager = AppManager.getInstance();
        this.invalidate(async () => {
            this.groups = await this.groupsManager.getGroups();
            await this.getGroupData(constants.EPI_ADMIN_GROUP)
        });
    }

    async getGroupData(groupId) {
        this.areMembersLoaded = false;
        this.selectedTab = groupId;
        this.selectedGroup = this.groups.find(group => group.id === groupId);
        this.groupMembers = await this.groupsManager.getMembers(this.selectedGroup.did);
        if (this.groupMembers && this.groupMembers.length > 0) {
            this.groupMembersMarkup = this.groupMembers.map(member => `<group-member data-presenter="group-member" data-username="${member.username}" data-groupName="${this.selectedGroup.name}" data-userDID="${member.did}" data-groupDID="${this.selectedGroup.did}"></group-member>`)
                .join("");
        } else {
            this.groupMembersMarkup = `<div class="empty-group-container">There are no members in this group!</div>`;
        }
        this.groupName = `"` + this.selectedGroup.name + `"`;
        this.areMembersLoaded = true;
    }

    beforeRender() {
        this.dataRecoveryButton = "";
        if (this.selectedTab === constants.EPI_WRITE_GROUP) {
            this.dataRecoveryButton = `
            <button class="groups-page-button" id="data-recovery-button" data-local-action="openDataRecoveryKeyModal">
                <span class="member-button-label">Data Recovery Key</span>
            </button>
        `
        }
    }

    afterRender() {
        for (let group of this.groups) {
            this.element.querySelector(`#${group.id} .tab-header-label`).textContent = group.name
        }

        this.selectTab(this.selectedTab);
        //TODO: [CODE-REVIEW] - not sure why we don't use this.element instead of document in order to query for dom elements...
        const input = document.getElementById('member-did-text');
        if(!input){
            //there is a possibility that this afterRender function to be called and no input is available in tht DOM to interact with
            return ;
        }
        //TODO: [CODE-REVIEW] - not sure why we don't use this.element instead of document in order to query for dom elements...
        const addMemberButton = document.getElementById('add-member-button');
        input.addEventListener('input', () => {
            if (input.value.trim() !== "") {
                addMemberButton.disabled = false;
            } else {
                addMemberButton.disabled = true;
            }
        });
    }

    changeTab(_target, groupId) {
        const currentSelectedTab = this.element.querySelector('.selected');
        if (currentSelectedTab) {
            currentSelectedTab.classList.remove('selected');
        }
        this.invalidate(async () => {
            await this.getGroupData(groupId)
        });
    }

    selectTab(groupId) {
        const selectedTab = this.element.querySelector(`#${groupId}`);
        selectedTab?.classList.add('selected');
    }

    async addMember(buttonElement) {
        let inputElement = this.element.querySelector("#member-did-text");
        const newMemberDid = inputElement.value;
        inputElement.value = "";
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        inputElement.dispatchEvent(event);

        let modal = await webSkel.showModal("info-modal", {
            title: "Adding member",
            content: newMemberDid
        })

        try {
            this.changeButtonState("loading");
            await this.groupsManager.addMember(this.selectedGroup.id, newMemberDid);
            this.invalidate(async () => {
                await this.getGroupData(this.selectedGroup.id)
            });
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(e.message);
        }
        this.changeButtonState("initial");
        webSkel.closeModal(modal);
    }

    changeButtonState(mode) {
        const addMemberButton = this.element.querySelector('#add-member-button');
        if (mode === "loading") {
            addMemberButton.classList.add("disabled");
            addMemberButton.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:18px; width: 18px; height: 18px;"></i>`;
        } else {
            addMemberButton.classList.remove("disabled");
            addMemberButton.innerHTML = `<div id="add-member-icon"></div>
                    <span class="member-button-label">Add Member</span>`;
        }
    }

    async removeMember(_target, memberDID) {

        let modal = await webSkel.showModal("info-modal", {
            title: "Deleting",
            content: memberDID
        })

        _target.classList.add("disabled");
        let targetContent = _target.innerHTML;
        _target.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:24px; position:relative; color: var(--dw-app-disabled-color);"></i>`

        try {
            await this.groupsManager.removeMember(this.selectedGroup.id, memberDID);
            this.invalidate(async () => {
                await this.getGroupData(this.selectedGroup.id)
            });
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(e.message);
        }
        _target.innerHTML = targetContent;
        _target.classList.remove("disabled");
        await webSkel.closeModal(modal);
    }

    async openDataRecoveryKeyModal(_target) {
        const modal = await webSkel.showModal("data-recovery-key-modal");
    }

    async notifyMember(group, member) {
        await utils.sendUserMessage(
            this.identity.did,
            group,
            member,
            "",
            constants.CONTENT_TYPE.GROUP_MEMBER,
            constants.RECIPIENT_TYPES.GROUP_RECIPIENT,
            constants.AUDIT_OPERATIONS.ADD
        );
    }
}
