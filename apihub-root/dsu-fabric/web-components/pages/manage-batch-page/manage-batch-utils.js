
const getDateInputTypeFromDateString = (dateValueString) => {
    /* YYYY-MM-DD || YYYYMMDD || YYYY-MM|| YYYYMM */
    return dateValueString.length === 10 || dateValueString.length === 6 ? "date" : "month";
}
const getFirstTwoDigitsOfYear = () => {
    const year = new Date().getFullYear();
    const yearString = year.toString();
    return yearString.slice(0, 2);
}
/* converts the 'YYMMDD'     | 'YYMM' string of batch expiryDate to a value that is assignable to an HTML input date or month field
             -> 'YYYY-MM-DD' | 'YYYY-MM'
*/
const parseDateStringToDateInputValue = (dateValueString) => {
    let inputStringDate = "";
    const separator = '-'
    if (getDateInputTypeFromDateString(dateValueString) === "date") {
        /* returns 'DD-MM-YYYY' */
        inputStringDate = dateValueString.slice(4, 6) +
            separator +
            dateValueString.slice(2, 4) +
            separator +
            getFirstTwoDigitsOfYear() +
            dateValueString.slice(0, 2)
    } else {
        /* returns 'MM-YYYY' */
        inputStringDate = dateValueString.slice(2, 4) +
            separator +
            getFirstTwoDigitsOfYear() +
            dateValueString.slice(0, 2)
    }
    return inputStringDate;
}
const createDateInput = (dateInputType, assignDateValue = null) => {
    let dateInput = document.createElement('input');
    dateInput.id = 'date';
    dateInput.classList.add('pointer');
    dateInput.classList.add('date-format-remover');
    dateInput.classList.add('form-control');
    dateInput.setAttribute('name', 'expiryDate');
    dateInput.setAttribute('type', dateInputType);
    if (assignDateValue) {
        dateInput.setAttribute('data-date', reverseInputFormattedDateString(assignDateValue));
        dateInput.value = assignDateValue;
        if (!dateInput.value) {
            console.error(`${assignDateValue} is not a valid date. Input type: ${dateInput}`)
        }
    }
    dateInput.addEventListener('click', function () {
        this.blur();
        if ('showPicker' in this) {
            this.showPicker();
        }
    });
    dateInput.addEventListener('change', function (event) {
        updateUIDate(this, event.target.value);
    })
    return dateInput
}
const getLastDayOfMonth = (year, month) => {
    if (typeof year === "string" && typeof month === "string") {
        [year, month] = [parseInt(year), parseInt(month)];
    }
    return new Date(year, month, 0).getDate();
}
/* 'DD-MM-YYYY' -> 'YYYY-MM-DD' || 'MM-YYYY' -> 'YYYY-MM' */
const reverseInputFormattedDateString = (dateString) => {
    const separator = '-';
    const dateParts = dateString.split(separator);
    return getDateInputTypeFromDateString(dateString) === 'date'
        ? dateParts[2] + separator + dateParts[1] + separator + dateParts[0]
        : dateParts[1] + separator + dateParts[0];
}
const updateUIDate = (dateInputElementRef, assignDateValue) => {
    dateInputElementRef.setAttribute('data-date', reverseInputFormattedDateString(assignDateValue));
    dateInputElementRef.value = assignDateValue;
}

/* does not take DCT into consideration */
const getCurrentDateTimeCET=()=> {
    const date = new Date();

    const offset = -60;
    const cetDate = new Date(date.getTime() + (offset * 60 * 1000));

    const year = cetDate.getFullYear();
    const month = (cetDate.getMonth() + 1).toString().padStart(2, '0');
    const day = cetDate.getDate().toString().padStart(2, '0');
    const hours = cetDate.getHours().toString().padStart(2, '0');
    const minutes = cetDate.getMinutes().toString().padStart(2, '0');
    const seconds = cetDate.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}CET`;
}
/* YYYY-MM-DD -> YYMMDD | YYYY-MM->YY-MM*/
const formatBatchExpiryDate=(dateString) =>{
    return dateString.split('-').map((part, index) => index === 0 ? part.slice(2) : part).join('');
}
const prefixMonthDate=(dateString)=>{
    const prefix="00";
    return dateString+prefix;
}
function removeMarkedForDeletion(key, value) {
    if (key === "EPIs") {
        return value.filter(unit => unit.action !== "delete");
    } else {
        return value;
    }
}
export{
    reverseInputFormattedDateString,
    getLastDayOfMonth,
    createDateInput,
    parseDateStringToDateInputValue,
    getDateInputTypeFromDateString,
    formatBatchExpiryDate,
    prefixMonthDate,
    removeMarkedForDeletion
}