import constants from "../constants.js";
import utils from "../utils.js";

export class MembersService{
    async deleteMembers(group, memberDID, operation) {
        let deleteMembersMsg = {
            messageType: operation === constants.OPERATIONS.REMOVE ? constants.MESSAGE_TYPES.USER_REMOVED : "DeactivateMember",
            groupDID: group.did,
            memberDID: memberDID,
            groupName: group.name,
            accessMode: group.accessMode,
            auditData: {
                action: operation === constants.OPERATIONS.REMOVE ? constants.OPERATIONS.REMOVE : constants.OPERATIONS.DEACTIVATE,
                userGroup: utils.getGroupName(group),
                userDID: memberDID
            }
        };

        let undigestedMessages = [];
        const messages = [deleteMembersMsg];
        try {
            undigestedMessages = await $$.promisify(webSkel.appServices.processMessagesWithoutGrouping)(messages);
        } catch (e) {
            return messages
        }

        if (undigestedMessages && undigestedMessages.length > 0) {
            return undigestedMessages.map(msg => {
                return {did: msg.memberDID}
            });
        } else {
            return [];
        }
    }
}