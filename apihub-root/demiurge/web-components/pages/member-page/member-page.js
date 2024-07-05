export class MemberPage{
    constructor(element, invalidate){
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async ()=>{
            this.userData = this.getUserData(this.element.getAttribute('data-userDID')); // replace with API call
        });
    }
    getUserData(userDID){
        return{
            username: 'DSU_Fabric/WriteWarrior',
            DID: 'did:ssi:name:vault:DSU_Fabric/WriteWarrior',
            group: 'ePI Write Group',
            groupDID: 'did:ssi:group:vault:ePI_Write_Group'
        }
    }

    beforeRender(){
        this.username = this.userData.username;
        this.userDID = this.userData.DID;
        this.group = this.userData.group;
        this.groupDID = this.userData.groupDID;
    }

    afterRender(){
    }

    copyFieldValue(target, elementId) {
        const element = this.element.querySelector(`#${elementId}`);
        if (element) {
            window.focus();
            navigator.clipboard.writeText(element.value)
                .then(() => console.log('Text copied to clipboard'))
                .catch(err => console.error('Error copying text: ', err));
        } else {
            console.error(`Element with id ${elementId} not found`);
        }
    }


}