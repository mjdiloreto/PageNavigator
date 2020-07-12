const puppeteer = require('puppeteer'); // This requires an entire Chromium, and is something like 300MB, but this is a hack and I don't care.
const fs = require('fs'); // for reading programs from disk.


const log = (fn, name) => async(...args) => {
    console.log('starting ' + name);
    const result = await fn(...args);
    console.log('result of ' + name + ' is ', result);
    console.log('ending ' + name);
    return result;
};

const intersperse = (coll, elt) => coll.flatMap(e => [e, elt]);


export default class PageNavigator {
    constructor(startPageURL) {
        this.page = startPageURL;
        this.context = null;

        this.page_actions = {};

        // Common utilities I find useful
        this.defAction("waitOneSecond", async (context, lastResult) => {await context.page.waitFor(1000); return lastResult;});
        this.defAction("screenshot", async (context, path, lastResult) => {await context.page.screenshot({path}); return lastResult;});
        this.defAction("returnToStartPage", async context => await context.page.goto(this.page));
        this.defAction("goto", async (context, pageURL) => await context.page.goto(page));
        this.defAction("tearDown", async context => await context.browser.close());
        this.defAction("saveToFile", (context, filename, value) =>
                       fs.appendFile(filename, JSON.stringify(value), err => {if (err) throw err;}));
        this.defAction("getElementText", async (context, selector) => {
            return await context.page.evaluate(() => {
                // I want to say evaluate does not support ES6? I don't know why I think this.
                let elts;
                try {
                    elts = document.getElementById(selector);
                } catch(e) {
                    try {
                        elts = document.getElementsByClassName(selector);
                    } catch(e) {
                        // I just can't be bothered to check if document,getElementById in evaluate throws an exception or not.
                    }
                }

                let texts = [];
                if (elts) {
                    for (elem of elts) {
                        texts.push(elem.innerText);
                    }
                }
                return texts;
            });
        });
        this.defAction("getElementTextByXPath", async (context, xPath) => {
            const elts = Array.from(await context.page.$x(xPath));
            let texts = [];
            for (let elem of elts) {
                texts.push(await context.page.evaluate(e => e.innerText, elem));
            }
            return texts;
        });
        // Should be uniquely identified by selector
        this.defAction("clickElement", async (context, selector) => await context.page.click(selector));
        // Should be uniquely identified by xPath
        this.defAction("clickElementByXPath", async (context, xPath) => {
            const linkHandlers = Array.from(await context.page.$x(xPath));
            await linkHandlers[0].click();
        });
    }

    async init() {
        // https://stackoverflow.com/questions/52553311/how-to-set-max-viewport-in-puppeteer
        // Use the maximum viewport size instead of 800x600
        const browser = await puppeteer.launch({defaultViewport: null});
        const page = await browser.newPage();

        this.context = {browser, page};
    }

    defAction(name, actionFn) {
        // Add the (non-variadic) action function to the navigator.
        const loggedActionFn = log(actionFn, name);

        this.page_actions[name] = loggedActionFn;
    }

    sequence(actions) {
        const program = [["returnToStartPage"]].concat(intersperse(actions, ["waitOneSecond"]).concat(["tearDown"]));

        return async () => {
            let lastResult;
            for (const currentAction of program) {
                const actionName = currentAction[0];
                const args = currentAction.slice(1);
                const namedAction = this.page_actions[actionName];
                if (namedAction) {
                    try {
                       lastResult = await namedAction(this.context, ...args, lastResult);
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    console.log("No action called " + currentAction);
                    break;
                }
            }
        };
    }
}

