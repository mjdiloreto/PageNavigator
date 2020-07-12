const PageNavigator = require('PageNavigator');

/* DERIVE XPATHS */
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


/* DETERMINE REQUIRED ACTIONS */
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

/* EXECUTE NAVIGATION */
// TODO actually do this correctly
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
