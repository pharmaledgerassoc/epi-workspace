export class WaitingAccessModal{
    constructor(element,invalidate) {
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.dataRecoveryKey="did:ssi:name:vault:Demiurge/victor"
    }
    afterRender(){

    }
}