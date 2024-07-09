export class MyIdentitiesPage{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async ()=>{
            this.did = "did:ssi:name:vault:Demiurge/devuser";
        });
    }
    beforeRender(){
    }
    afterRender(){
        let input = this.element.querySelector(".did-identity");
        input.value = this.did;
    }
    async copyIdentity(){
        let input = this.element.querySelector(".did-identity");
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        await navigator.clipboard.writeText(input.value);
    }
}