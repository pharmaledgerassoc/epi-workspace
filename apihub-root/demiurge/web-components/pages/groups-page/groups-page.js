import constants from "../../../constants.js";
import utils from "../../../utils.js";

const mockData = {
    administrationGroup: [
        {
            username: 'DSU_Fabric/AdminWarrior',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminWarrior',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminMage',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminMage',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminRogue',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminRogue',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminPaladin',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminPaladin',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminCleric',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminCleric',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminBard',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminBard',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminDruid',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminDruid',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminSorcerer',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminSorcerer',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminNecromancer',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminNecromancer',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminMonk',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminMonk',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminRanger',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminRanger',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminKnight',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminKnight',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminBarbarian',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminBarbarian',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminAssassin',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminAssassin',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminWizard',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminWizard',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminWarlock',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminWarlock',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminBerserker',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminBerserker',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminTemplar',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminTemplar',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminCrusader',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminCrusader',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        },
        {
            username: 'DSU_Fabric/AdminWitch',
            DID: 'did:ssi:name:vault:DSU_Fabric/AdminWitch',
            group: 'ePI Administration Group',
            groupDID: 'did:ssi:group:vault:ePI_Administration_Group'
        }
    ],
    writeGroup: [
        {
            username: 'DSU_Fabric/WriteWarrior',
            DID: 'did:ssi:name:vault:DSU_Fabric/WriteWarrior',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        },
        {
            username: 'DSU_Fabric/WriteMage',
            DID: 'did:ssi:name:vault:DSU_Fabric/WriteMage',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        },
        {
            username: 'DSU_Fabric/WriteRogue',
            DID: 'did:ssi:name:vault:DSU_Fabric/WriteRogue',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        },
        {
            username: 'DSU_Fabric/WritePaladin',
            DID: 'did:ssi:name:vault:DSU_Fabric/WritePaladin',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        },
        {
            username: 'DSU_Fabric/WriteCleric',
            DID: 'did:ssi:name:vault:DSU_Fabric/WriteCleric',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        },
        {
            username: 'DSU_Fabric/WriteBard',
            DID: 'did:ssi:name:vault:DSU_Fabric/WriteBard',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        },
        {
            username: 'DSU_Fabric/WriteDruid',
            DID: 'did:ssi:name:vault:DSU_Fabric/WriteDruid',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        },
    ],
    readGroup: [
    ]
};

const groupNames = {
    Administration: "ePI Administration Group",
    Write: "ePI Write Group",
    Read: "ePI Read Group"
}

export class GroupsPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            this.groupMembers = await this.getGroupData("Administration"); //replace with API call
            this.selectedGroup = {
                name: 'ePI Administration Group',
                did: 'did:ssi:group:vault:ePI_Administration_Group'
            }
            this.members = await this.fetchMembers();
            this.areMembersLoaded = true;
        });
    }

    getGroupData(groupId) {
        const getAdministrationGroupMembers = () => {
            return mockData["administrationGroup"]||[]
        }
        const getWriteGroupMembers = () => {
            return mockData["writeGroup"]||[]
        }
        const getReadGroupMembers = () => {
            return mockData["readGroup"]||[]
        }
        switch (groupId) {
            case "Administration":
                return getAdministrationGroupMembers();
            case "Write":
                return getWriteGroupMembers();
            case "Read":
                return getReadGroupMembers();
            default:
                return getAdministrationGroupMembers();
        }
    }

    beforeRender() {
        const renderAdministrationGroup = () => {
            this.dataRecoveryButton="";
        }
        const renderWriteGroup = () => {
           this.dataRecoveryButton=`
            <button class="groups-page-button" id="data-recovery-button" data-local-action="openDataRecoveryKeyModal">
                <span class="member-button-label">Data Recovery Key</span>
            </button>
        `
        }
        const renderReadGroup = () => {
            this.dataRecoveryButton="";
        }
        switch (this.selectedTab) {
            case "Administration":
                renderAdministrationGroup()
                break;
            case "Write":
                renderWriteGroup()
                break;
            case "Read":
                renderReadGroup()
                break;
            default:
                this.selectedTab = "Administration";
                renderAdministrationGroup()
        }
        this.groupName = `"` + groupNames[this.selectedTab] + `"`;
        if (this.groupMembers.length > 0) {
            this.groupMembersMarkup = this.groupMembers
                .map(member => `<group-member data-presenter="group-member" data-username="${member.username}" data-group="${member.group}" data-userDID="${member.DID}" data-groupDID="${member.groupDID}"></group-member>`)
                .join("");
        } else {
            this.groupMembersMarkup = `<div class="empty-group-container">There are no members in this group!</div>`;
        }

    }

    afterRender() {
        this.selectTab(this.selectedTab);
            const input = document.getElementById('member-did-text');
            const addMemberButton=document.getElementById('add-member-button');
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
        this.selectedTab = groupId;
        this.invalidate(async () => {
            this.groupMembers = await this.getGroupData(groupId)
        });
    }

    selectTab(groupId) {
        const selectedTab = this.element.querySelector(`#${groupId}`);
        selectedTab?.classList.add('selected');
    }

    async addMember(buttonElement){
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
            let groups = await utils.fetchGroups();
            let selectedGroup = constants.EPI_GROUP_TAGS.find(group => group.name === this.selectedTab);
            if (!selectedGroup) {
                selectedGroup = groups.find(group => group.name === this.selectedGroup.name);
            }
            selectedGroup.did = this.selectedGroup.did;

            let hasGroupTag = selectedGroup.tags.split(',').findIndex(tag => newMemberDid.toLowerCase().includes(tag.trim().toLowerCase())) !== -1;
            if (!hasGroupTag) {
                webSkel.reportUserRelevantError("User can not be added to selected group. Please check user group.")
            }

            this.changeButtonState("loading");

            let allMembers = [];
            for (let i = 0; i < groups.length; i++) {
                let groupMembers = await this.fetchMembers(groups[i]);
                allMembers = [...allMembers, ...groupMembers]
            }
            let alreadyExists = allMembers.find(arrMember => arrMember.did === newMemberDid)
            if (alreadyExists) {
                this.changeButtonState();
                webSkel.reportUserRelevantError("Member already registered in a group!");
            }

            const member = await this.addMember(selectedGroup, {did: newMemberDid});
            this.members.push(member);

        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError("Could not add user to the group because: ", e)
        }
        webSkel.closeModal(modal);
    }
    changeButtonState(mode) {
        const addMemberButton = this.element.getElementById('add-member-button');
        if (mode === "loading") {
            addMemberButton.classList.add("disabled");
            addMemberButton.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:18px; width: 18px; height: 18px;"></i>`;
        } else {
            addMemberButton.classList.remove("disabled");
            addMemberButton.innerHTML = `<div id="add-member-icon"></div>
                    <span class="member-button-label">Add Member</span>`;
        }
    }
    async fetchMembers(group) {
        if (!group) {
            group = this.selectedGroup;
        }
        return new Promise((resolve, reject) => {
            const w3cDID = require("opendsu").loadAPI("w3cdid");
            w3cDID.resolveDID(group.did, (err, groupDIDDocument) => {
                if (err) {
                    return reject(err);
                }

                groupDIDDocument.listMembersInfo((err, members) => {
                    if (err) {
                        return reject(err);
                    }
                    let result = members.map((member) => {
                        member["enable_deactivate_group_member_feature"] = this.enable_deactivate_group_member_feature;
                        return member;
                    })
                    return resolve(result);
                });
            });
        });
    }

    async removeMember(buttonElement){
        const memberToRemove=webSkel.reverseQuerySelector(_target,'group-member');
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
    async removeGroupMember (did, operation){
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
    async openDataRecoveryKeyModal(_target){
        const modal= await webSkel.showModal("data-recovery-key-modal");
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