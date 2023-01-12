// If your extension doesn't need a content script, just leave this file empty

// This is an example of a script that will run on every page. This can alter pages
// Don't forget to change `matches` in manifest.json if you want to only change specific webpages

/*global chrome*/

//Add pakcage import statements

console.log("Extension content script started...");

//by default Extension closed
chrome.storage.sync.set({ extensionVisible: false }, function () {
  console.log("Extension opened ? " + false);
});

/** Logic for Extension side slide UI */

chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (msg.command === "toggle") {
    // if toggle command received open/close Extension UI
    toggleExtentionUI();
  }
});

// Extension extention UI in an Iframe as sidebar
var iframe = document.createElement("iframe");
iframe.style.background = "#fff";
// iframe.style.borderLeft = "1px solid #f6f6f6";
//iframe.style.boxShadow = "inset 0px 0px 0px 1px #dadada";
iframe.style.height = "100%";
iframe.style.width = "0px";
iframe.style.position = "fixed";
iframe.style.top = "0px";
iframe.style.right = "0px";
iframe.style.zIndex = "9000000000000000000";
iframe.frameBorder = "none";
iframe.src = chrome.extension.getURL("popup.html");
iframe.allow = "clipboard-write"; // required for copying data to user clipboard - Akash
document.body.appendChild(iframe);


// Extension UI toggle button
var b = document.createElement("button");
b.setAttribute("id", "extension-toggle-btn");
b.style.height = "55px";
b.style.width = "55px";
b.style.background = "#4659ff";
b.style.fontsize = "20px";
b.style.border = "none";
b.style.borderTopLeftRadius = "50px";
b.style.borderBottomLeftRadius = "50px";
b.style.position = "fixed";
b.style.top = "45%";
b.style.right = "0px";
b.style.zIndex = "9000000000000000000";
document.body.appendChild(b);

//handle Extension button click
b.onclick = function () {
  if (iframe.style.width === "0px") {
    iframe.style.width = "320px";
    b.style.right = "320px";
    iframe.style.borderLeft = "1px solid #dadada";
    chrome.storage.sync.set({ extensionVisible: true }, function () {
      console.log("Extension opened ? " + true);
    });
    //start scraper
    //scrapeOnPageData();
  } else {
    iframe.style.width = "0px";
    iframe.style.borderLeft = "transparent";
    b.style.right = "0px";
    chrome.storage.sync.set({ extensionVisible: false }, function () {
      console.log("Extension opened ? " + false);
    });
  }
};

// Adding Extension icon inside Extension toggle button
var toggleButtonIcon = document.createElement("img");
toggleButtonIcon.style.height = "45px";
toggleButtonIcon.style.width = "45px";
toggleButtonIcon.style.marginTop = "3px";
toggleButtonIcon.style.marginLeft = "2px";
toggleButtonIcon.src = chrome.extension.getURL("img/leadzilla-logo-v2.svg");
var leadzillaToggleBtn = document.getElementById("extension-toggle-btn");
leadzillaToggleBtn.appendChild(toggleButtonIcon);

// Make the Extension toggle button draggable:
dragElement(document.getElementById("extension-toggle-btn"));

/** Logic for making Extension toggle button draggable */
function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos2 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos2 - e.clientY;
    pos2 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos1 + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Open/Close Extension extention UI Iframe
function toggleExtentionUI() {
  if (iframe.style.width === "0px") {
    iframe.style.width = "320px";
    b.style.right = "320px";
    chrome.storage.sync.set({ extensionVisible: true }, function () {
      console.log("Extension opened ? " + true);
    });
    //start scraper
    //scrapeOnPageData();
  } else {
    iframe.style.width = "0px";
    b.style.right = "0px";
    chrome.storage.sync.set({ extensionVisible: false }, function () {
      console.log("Extension opened ? " + false);
    });
  }
}

//Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message.command);
  sendResponse({
    data: "message received by content script",
  });
});

/** Run scrapping on page render event */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);
  if (message.command === "page-rendered") {
    (window.onload = function () {
      console.log("Extension content script started...");

      setTimeout(function () {
        // check if Extension is opened ? if yes then scrape
        chrome.storage.sync.get(["extensionVisible"], (result) => {
          console.log("Extension status ---->", result);
          if (result.extensionVisible === true) scrapeOnPageData();
        });
      }, 2000);
    })();
  }


  function doSomething(msg){
    console.log("do something: ",msg)
  }

  // look for incoming messages & change something on opened website
  if (message.command === "demo-message") {
    doSomething(message.payload);
  }
});

// read chrome extensions local storage values
const readLocalStorage = async (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      console.log("result: ", result);

      if (result[key] === undefined) {
        console.log("reject...")
        reject();
      } else {
        resolve(result[key]);
      }
    });
  });
};


/**
 * Auto executing on every refresh
 */
(window.onload = function () {
  console.log("Extension content script started...");

  // execute after 2 sec
  setTimeout(function () {
    // check if Extension is opened ? if yes then scrape
    chrome.storage.sync.get(["extensionVisible"], (result) => {
      console.log("Extension status ---->", result);
      if (result.extensionVisible === true) scrapeOnPageData();
    });

      // perform something after refresh load
  }, 2000);
})();



function scrapeOnPageData() {
  //check if Extension popup launched
  chrome.runtime.sendMessage(
    {
      command: "ready-to-scrape",
      payload: [],
    },

    // if response received from Extension popup for above message then scrape
    function (response) {
      //enable for debugging
      console.log(response);
      if (response.data === "Extension-launched") {
        //publish message for popup.html to show loading
        chrome.runtime.sendMessage(
          {
            command: "scrapping-started",
            payload: [],
          },
          function (response) {
            //enable for debugging
            console.dir(response);
          }
        );


        //Here goes DOM element selection logic for scraping/injecting on currently opened website


        // send scraped data to Extension UI
        chrome.runtime.sendMessage(
          {
            command: "new-profile-data",
            payload: {dataFromContentScript:"hello"},
          },
          function (response) {
            //enable for debugging
            console.dir(response);
          }
        );
      }
    }
  )
}




//printAllPageLinks();
// This needs to be an export due to typescript implementation limitation of needing '--isolatedModules' tsconfig
// export function printAllPageLinks() {
//   const allLinks = Array.from(document.querySelectorAll("a")).map(
//     (link) => link.href
//   );

//   console.log("-".repeat(30));
//   console.log(
//     `These are all ${allLinks.length} links on the current page that have been printed by the Sample Create React Extension`
//   );
//   console.log(allLinks);
//   console.log("-".repeat(30));
// }
