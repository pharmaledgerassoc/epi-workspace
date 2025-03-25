const {ApiClient} = require("./Client.js");

class FixedUrls extends ApiClient  {

    constructor(config, timeout = 1) {
        super(config);
        this.timeout = timeout;
    }

    getBaseURL(){
        return `${this.config.sor_endpoint.replace("integration", "")}`;
    }

    async  waitForCompletion(){
        return new Promise(async (resolve, reject) => {
            let scheduled;
            try {
                let response = await this.send("/statusFixedURL", "GET");
                scheduled = response.scheduled;
            } catch (e){
                console.error("Error waiting for completion", e);
                return reject(e);
            }

            const self =  this;
            if (scheduled > 0){
                const timeout = Math.max(this.timeout, scheduled/10)
                console.debug(`Waiting for ${timeout} seconds for Fixed URL to complete.`);
                return setTimeout(() => {
                    self.waitForCompletion.call(self)
                }, timeout * 1000);
            }
            console.debug(`Fixed URL finished`);
            resolve()
        })
    }
}

module.exports = {
    FixedUrls
};