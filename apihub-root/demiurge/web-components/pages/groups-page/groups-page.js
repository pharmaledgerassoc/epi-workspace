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
            this.groupMembersMarkup = this.groupMembers.map(member => `<group-member data-presenter="group-member" data-username="${member.username}" data-group="${member.group}" data-userDID="${member.did}" data-groupDID="${member.groupDID}"></group-member>`)
                .join("");
        } else {
            this.groupMembersMarkup = `<div class="empty-group-container">There are no members in this group!</div>`;
        }
        this.groupName = `"` + this.selectedGroup.name + `"`;
        this.areMembersLoaded = true;
    }

    initLeftSideMenu() {
        let pageContent = document.querySelector("#page-content");
        pageContent.insertAdjacentHTML("beforebegin", `<sidebar-menu data-presenter="left-sidebar"></sidebar-menu>`);

    }

    beforeRender() {
        if (!document.querySelector("sidebar-menu")) {
            this.initLeftSideMenu();
        }
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
        const input = document.getElementById('member-did-text');
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
            this.changeButtonState("initial");
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(e.message)
        }
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

    async removeMember(buttonElement) {
        const memberToRemove = webSkel.reverseQuerySelector(_target, 'group-member');
        memberToRemove.remove();

        buttonElement.classList.add("disabled");
        let targetContent = buttonElement.innerHTML;
        buttonElement.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:24px; top: 25%; position:relative; color: var(--dw-app-disabled-color);"></i>`
        if (this.model.did !== this.did) {
            await this.removeGroupMember(model.did, constants.OPERATIONS.REMOVE)
        } else {
            webSkel.renderToast("You tried to delete your account. This operation is not allowed.", constants.NOTIFICATION_TYPES.ERROR);
        }
        buttonElement.innerHTML = targetContent;
        buttonElement.classList.remove("disabled");
        this.invalidate();
    }

    async removeGroupMember(did, operation) {
        let modal = await webSkel.showModal("info-modal", {
            title: constants.OPERATIONS.REMOVE ? "Deleting" : "Deactivating",
            content: did
        })

        let undeleted = await webSkel.appServices.deleteMembers(this.selectedGroup, did, operation);

        await webSkel.closeModal(modal);
        if (undeleted.length > 0) {
            await webSkel.renderToast("Member could not be deleted", constants.NOTIFICATION_TYPES.ERROR);
            return;
        }
        this.members = this.members.filter((member) => member.did !== did);
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
            constants.OPERATIONS.ADD
        );
    }
}
