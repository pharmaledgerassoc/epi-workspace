/**
 * Generates a date string in YYMMDD format adjusted by a time period
 * @param {string} period - Time period to adjust (e.g. "1y", "-2m", "3d")
 * @returns {string} Date in YYMMDD format
 */
function getYYMMDDDate(period) {
    const date = new Date();

    // Parse period (e.g. "-1y" → { value: -1, unit: 'y' })
    const match = period.match(/^(-?\d+)([ymd])$/i);
    if (!match) throw new Error(`Invalid period format. Use like "1y", "-2m", "3d"`);

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    // Adjust date
    switch (unit) {
        case "y":
            date.setFullYear(date.getFullYear() + value);
            break;
        case "m":
            date.setMonth(date.getMonth() + value);
            break;
        case "d":
            date.setDate(date.getDate() + value);
            break;
    }

    // Format as DDMMYY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    return year + month + day;
}

module.exports = {getYYMMDDDate}