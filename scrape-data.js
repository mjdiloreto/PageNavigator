const puppeteer = require('puppeteer'); // This requires an entire Chromium, and is something like 300MB, but this is a hack and I don't care.
const fs = require('fs'); // for reading programs from disk.


const log = fn => async(...args) => {
    console.log('starting ' + fn.name);
    const result = await fn(...args);
    console.log('ending ' + fn.name);
    return result;
};

const intersperse = (coll, elt) => coll.flatMap(e => [e, elt]);


class PageNavigator {
    constructor(startPageURL) {
        this.page = startPageURL;
        this.context = null;

        this.voidSentinel = {secret: "My super secret sentinel, I hope no one ever returns this"};

        this.page_actions = {};

        // Common utilities I find useful
        this.defAction("waitOneSecond", async context => await context.page.waitFor(1000));
        this.defAction("screenshot", async (context, path) => await context.page.screenshot({path}));
        this.defAction("returnToStartPage", async context => await context.page.goto(this.page));
        this.defAction("goto", async (context, pageURL) => await context.page.goto(page));
        this.defAction("tearDown", async context => await context.browser.close());
        this.defAction("saveToFile", (context, filename, value) => fs.appendFile(filename, JSON.stringify(value), err => {if (err) throw err;}));
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
            return elts.map(async elem => await context.page.evaluate(e => e.innerText, elem));
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
        const browser = await puppeteer.launch();
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
            program.reduce(async (lastResult, currentAction) => {
                if (lastResult === this.voidSentinel) return this.voidSentinel;

                const actionName = currentAction[0];
                const args = currentAction.slice(1);
                const namedAction = this.page_actions[actionName];
                if (namedAction) {
                    // might return null or undefined
                    // Always pass last result as last arg. No variadic functions acceptable as callbacks.
                    return await namedAction(this.context, ...args, lastResult);
                    // retry if error maybe?
                    // else if actionName === "eval" ...?
                } else {
                    return this.voidSentinel;
                }
            },
            null);
        };
    }
}


const unitNumberXPath = '//div[@id="unitstable"]/div[contains(@class, "unitrow")]/div[contains(@class, "tablecolumn")]/h5[1]';
const minPriceXPath = '//div[@id="unitstable"]/div[contains(@class, "unitrow")]/div[contains(@class, "tablecolumn")]/span[contains(@class, "currency")][1]';
const maxPriceXPath = '//div[@id="unitstable"]/div[contains(@class, "unitrow")]/div[contains(@class, "tablecolumn")]/span[contains(@class, "currency")][2]';
const datetime = new Date().toISOString();

const actions = [
    ["getElementTextByXPath", unitNumberXPath],
    ["saveToFile", "unitNumber" + datetime + ".dat"],

    ["getElementTextByXPath", minPriceXPath],
    ["saveToFile", "minPrice" + datetime + ".dat"],

    ["getElementTextByXPath", maxPriceXPath],
    ["saveToFile", "maxPrice" + datetime + ".dat"],
];

console.log(datetime + " - Starting gables price check");
const gablesNavigator = new PageNavigator("https://www.gables.com/communities/massachusetts/medford/re150/a1/");
gablesNavigator.init();
const gablesPriceChecker = gablesNavigator.sequence(actions);
gablesPriceChecker();
console.log(datetime + " - Ending gables price check");

// Mobile view (small viewport)
/*
  <div class="content">
    <h3></h3>
    <p>131</p>                     <-- unit-number = '//div'
    <p>
      <span class="currency">
      <!-- react-text: 422 -->
      <!-- /react-text -->
      <!-- react-text: 423 -->
      2310                         <--- min-price
      <!-- /react-text -->
      </span>
      <!-- react-text: 424 -->
      -
      <!-- /react-text -->
      <span class="currency">
        <!-- react-text: 426 -->
        <!-- /react-text -->
        <!-- react-text: 427 -->
        2745                       <-- max-price
        <!-- /react-text -->
      </span>
    </p>
    <p>Available Now</p>
    <p>n/a Floor</p>
  </div>
*/

// Desktop view (larger viewport)
/*
  <div class="unitstable-component" id="unitstable">
   ...
    <div class="unitrow">
    <div class="tablecolumn"><h5>131</h5></div>    <-- unit-number = '//div[@id="unitstable"]/div[contains(@class, "unitrow")]/div[contains(@class, "tablecolumn")]/h5[1]'
        <div class="tablecolumn">
          <h5>
            <span class="currency">
              <!-- react-text: 1039 -->
              <!-- /react-text -->
              <!-- react-text: 1040 -->
              2310                                 <-- min-price = '//div[@id="unitstable"]/div[contains(@class, "unitrow")]/div[contains(@class, "tablecolumn")]/span[contains(@class, "currency")][1]'
              <!-- /react-text -->
            </span>
              <!-- react-text: 1041 -->
              -
              <!-- /react-text -->
            <span class="currency">
              <!-- react-text: 1043 -->
              <!-- /react-text -->
              <!-- react-text: 1044 -->
              2745                                 <-- max-price = '//div[@id="unitstable"]/div[contains(@class, "unitrow")]/div[contains(@class, "tablecolumn")]/span[contains(@class, "currency")][2]'
              <!-- /react-text -->
            </span>
          </h5>
        </div>
      </div>
    </div>
  */
