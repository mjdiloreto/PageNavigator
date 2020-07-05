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


class PageNavigator {
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


// Via firefox -> inspect Element -> copy -> xPath
// first unitNumber  ->   /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div[1]/div/div[1]/p[1]
// second unitNumber ->   /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div[2]/div/div[1]/p[1]
// unitNumber        ->   /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div/div/div[1]/p[1]
const unitNumberXPath =  '/html/body/div[3]/section[2]/div/div/div/div/div/div/div/div/div/div[1]/p[1]';

// first minPrice    ->  /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div[1]/div/div[1]/p[2]/span[1]
// second minPrice   ->  /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div[2]/div/div[1]/p[2]/span[1]
// minPrice          ->  /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div/div/div[1]/p[2]/span[1]
const minPriceXPath  =  '/html/body/div[3]/section[2]/div/div/div/div/div/div/div/div/div/div[1]/p[2]/span[1]';

// first maxPrice    ->  /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div[1]/div/div[1]/p[2]/span[2]
// second maxPrice   ->  /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div[2]/div/div[1]/p[2]/span[2]
// maxPrice          ->  /html/body/div[3]/section[2]/div/div/div/div/div/div/div/div/div/div[1]/p[2]/span[2]
const maxPriceXPath  =  '/html/body/div[3]/section[2]/div/div/div/div/div/div/div/div/div/div[1]/p[2]/span[2]';

const datetime = new Date().toISOString();

const actions = [
    //["screenshot", "screenshot1.png"],
    ["getElementTextByXPath", unitNumberXPath],
    ["saveToFile", "data/" + datetime + "unitNumber.dat"],

    ["getElementTextByXPath", minPriceXPath],
    ["saveToFile", "data/" + datetime + "minPrice.dat"],

    ["getElementTextByXPath", maxPriceXPath],
    ["saveToFile", "data/" + datetime + "maxPrice.dat"],
    //["screenshot", "screenshot2.png"]
];

const main = async () => {
    console.log(datetime + " - Starting gables price check");
    const gablesNavigator = new PageNavigator("https://www.gables.com/communities/massachusetts/medford/re150/a1/");
    await gablesNavigator.init();
    const gablesPriceChecker = gablesNavigator.sequence(actions);
    await gablesPriceChecker();
    console.log(datetime + " - Ending gables price check");
};

main();

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

// Desktop view (larger viewport, unused in this program)
/*
  <div class="unitstable-component" id="unitstable">
   ...
    <div class="unitrow">
    <div class="tablecolumn"><h5>131</h5></div>    <-- unit-number
        <div class="tablecolumn">
          <h5>
            <span class="currency">
              <!-- react-text: 1039 -->
              <!-- /react-text -->
              <!-- react-text: 1040 -->
              2310                                 <-- min-price
              <!-- /react-text -->
            </span>
              <!-- react-text: 1041 -->
              -
              <!-- /react-text -->
            <span class="currency">
              <!-- react-text: 1043 -->
              <!-- /react-text -->
              <!-- react-text: 1044 -->
              2745                                 <-- max-price
              <!-- /react-text -->
            </span>
          </h5>
        </div>
      </div>
    </div>
  */
