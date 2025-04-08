export class StrengthsManagementModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.id = this.element.getAttribute("data-id");
        let encodedData = this.element.getAttribute("data-updateData");
        this.buttonName = "Accept";
        if (encodedData) {
            this.existingData = JSON.parse(decodeURIComponent(encodedData));
            this.buttonName = "Update strength";
        }
        this.invalidate();
        this.excludedOptions = JSON.parse(decodeURIComponent(this.element.getAttribute("data-excluded")));
    }

    beforeRender() {
    }

    afterRender() {
        if (this.existingData) {
            let keys = ["substance", "strength"];
            for (let key of keys) {
                let input = this.element.querySelector(`#${key}`);
                input.value = this.existingData[key];
            }
        }
    }

    closeModal(_target) {
        webSkel.closeModal(_target);
    }

    switchModalView() {
        let modal = webSkel.getClosestParentElement(this.element, "dialog");
        if (!modal.getAttribute("data-expanded")) {
            modal.setAttribute("data-expanded", "true")
            modal.style.width = "95%";
            modal.style.maxWidth = "95vw";
            this.element.style.marginLeft = "0";
        } else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "75%";
            modal.style.maxWidth = "75vw";
            this.element.style.marginLeft = "240px";
        }
    }

    hasCodeOrHTML(element) {
        return !webSkel.appServices.hasCodeOrHTML(element.value);
    }

    invalidStrengthInput(element) {
        return !webSkel.appServices.hasCodeOrHTML(element.value) && !(typeof element.value === "string" && element.value.trim().length === 0);
    }

    sanitizeSpaces(input) {
        if (typeof input === 'string')
            return input.trim();

        if (typeof input === 'object' && input !== null) {
            for (const key in input) {
                if (input.hasOwnProperty(key)) {
                    if (typeof input[key] === 'string') {
                        input[key] = input[key].trim();
                    } else if (typeof input[key] === 'object') {
                        this.sanitizeSpaces(input[key]);
                    }
                }
            }
        }
        return input;
    }

    async addStrength(_target) {
        const conditions = {
            "hasCodeOrHTML": {fn: this.hasCodeOrHTML, errorMessage: "Invalid input!"},
            "invalidStrengthInput": {fn: this.invalidStrengthInput, errorMessage: "Invalid input: the value contains HTML tags or only spaces"}
        };
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"), conditions);
        if (formData.isValid) {
            let resultObject = {};
            Object.keys(formData.data).forEach(key => {
                resultObject[key] = this.sanitizeSpaces(formData.data[key] || "");
            });
            if (this.id) {
                resultObject.id = this.id;
            }
            webSkel.closeModal(_target, resultObject);
        }
    }
}
