import {CommonPresenterClass} from "../../CommonPresenterClass.js";

export class StrengthsTab extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.invalidate();
        this.strengths = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
    }

    beforeRender() {
        let stringHTML = "";
        if (this.strengths.length > 0 && !this.strengths.every(strength => strength.action === "delete")) {
            for (let strength of this.strengths) {
                if (strength.action === "delete") {
                    continue;
                }
                stringHTML += `<div class="strength-unit pointer" data-id="${strength.id}" data-local-action="viewstrength">
                                <div class="strength-details">${strength.substance} - ${strength.strength}</div>
                                    <div userrights="$$userRights" class="delete-button pointer" data-local-action="deleteStrength">
                                        <img class="strength-img" src="./assets/icons/thrash.svg" alt="thrash">
                                    </div>
                              </div>`;
            }
        } else {
            stringHTML = `<div class="no-data">No strengths added yet</div>`;
        }
        this.strengthUnits = stringHTML;
    }

    afterRender() {

    }

}
