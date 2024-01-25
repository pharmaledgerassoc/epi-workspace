import {closeModal} from "../../../imports.js"
export class AuditEntryModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender(){}
    closeModal(_target) {
        closeModal(_target);
    }
}