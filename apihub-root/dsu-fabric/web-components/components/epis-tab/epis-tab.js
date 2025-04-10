import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class EPIsTab extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.invalidate();
    }

    beforeRender() {
        this.epis = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
        let stringHTML = "";
        if (this.epis.length > 0 && !this.epis.every(epi => epi.action === "delete")) {
            for (let epi of this.epis) {
                if (epi.action === "delete") {
                    continue;
                }

                stringHTML += `<div class="epi-unit" data-id="${epi.id}">
                            <div class="epi-details">
                                <div class="epi-language">${gtinResolver.Languages.getLanguageName(epi.language)} ${this.getEPIDescription(epi.type)}</div>
                                <div>${epi?.ePIMarket ? this.getCountryName(epi?.ePIMarket) : ''}</div>
                                <div class="epi-files">${epi.filesCount} files</div>
                            </div>
                            <div class="epi-buttons">
                            ${this.userRights === constants.USER_RIGHTS.WRITE ?
                    '<div class="epi-button pointer" data-local-action="deleteEpi">' +
                    '<img class="epi-img" src="./assets/icons/thrash.svg" alt="thrash"/></div>' : ''
                }
                            <div class="epi-button pointer" data-local-action="viewLeaflet">
                                <img class="epi-img" src="./assets/icons/eye.svg" alt="eye">
                            </div>
                            </div>
                        </div>`
            }
        } else {
            stringHTML = `<div class="no-data">No leaflets added yet</div>`;
        }

        this.epiUnits = stringHTML;
    }

    afterRender() {
        this.epis = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
    }

    getEPIDescription(value) {
        const key = Object.keys(gtinResolver.constants.EPI_TYPES || {}).find(key => gtinResolver.constants.EPI_TYPES[key] === value);
        return key ? gtinResolver.constants.EPI_TYPES_DESCRIPTION[key] : "";
    }

    getCountryName(countryCode) {
        let countryName = countryCode || "";
        try {
            if (countryCode)
                countryName = gtinResolver.Countries.getCountry(countryCode);
        } catch (e) {
            console.error(e);
        }
        return countryName;
    }

}
