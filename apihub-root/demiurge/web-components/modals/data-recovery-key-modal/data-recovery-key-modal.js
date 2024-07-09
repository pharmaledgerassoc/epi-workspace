export class DataRecoveryKeyModal{
    constructor(element,invalidate) {
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.dataRecoveryKey="XLEXhsLoqwXxEWxk9nFGaX6wZY4CkiNsvfzFdMNPTPAUcxLSn11mjecNksmrAJtMGj5MGmaT67AZ9uCpTfbHD9    "
    }
    afterRender(){
        const input = document.getElementById('data-recovery-key');
        const addMemberButton=document.getElementById('submitDataRecoveryKey');
        input.addEventListener('input', () => {
            if (input.value.trim() !== "") {
                addMemberButton.disabled = false;
            } else {
                addMemberButton.disabled = true;
            }
        });
    }
    async submitDataRecoveryKey(_target){
        await webSkel.closeModal(_target);
    }
}