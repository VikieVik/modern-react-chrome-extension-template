// If your extension doesn't need a background script, just leave this file empty

/*global chrome*/


//Add pakcage import statements here


messageInBackground();
handleCurrentTabURLChange();
handleExtentionIconClick();

// send page-rendered message to restart scraper
function restartScraper() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabDetails) => {
    console.log("tabDetails: ", tabDetails);

    console.log("tabDetails: ", tabDetails);

    //sends messages to all active tabs for now
    //Todo: filter tabs with linkedin url and only send render message to that single tab
    // tabDetails.forEach((tab) => {
      chrome.tabs.sendMessage(tabDetails[0].id, {
        command: "page-rendered",
      });
    // });
  });
}


// Bi-directional communication between background.js and popup.js via PORT
chrome.extension.onConnect.addListener(function (port) {
  console.log("Connected .....");
  port.onMessage.addListener(function (msg) {
    console.log("message recieved from popup.js " + msg);
    // port.postMessage("Hi from background.js");
    if (msg === "scrape-data") {
      console.log("restart scrapping");
      restartScraper();
      //chrome.runtime.sendMessage({ command: "page-rendered" });
    }
  });
});

// This needs to be an export due to typescript implementation limitation of needing '--isolatedModules' tsconfig
export function messageInBackground() {
  console.log("Extension background script started....");
}

export function handleCurrentTabURLChange() {
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    let tabId = details.tabId;
    let currentUrl = details.url;
    console.log(tabId, currentUrl);

    // send page render ping message to content script
    chrome.tabs.sendMessage(tabId, { command: "page-rendered" });

    //publish message for content.js to start scrapping new page
    // chrome.runtime.sendMessage(
    //   {
    //     command: "page-rendered",
    //   },
    //   function (response) {
    //     //enable for debugging
    //     console.dir(response);
    //   }
    // );
  });
}

export function handleExtentionIconClick() {
  // open popup.html in new browser window if extention icon is clicked
  chrome.browserAction.onClicked.addListener(function (tab) {
    console.log("extention icon clicked");


    /**Open Extension inside current website page as side-slider */

    // toggle signal to open/close sidebar
    // chrome.tabs.query({ active: true }, (tabDetails) => {
    //   console.log(tabDetails);

    //   //sends messages to all active tabs for now
    //   //Todo: filter tabs with linkedin url and only send render message to that single tab
    //   tabDetails.forEach((tab) => {
    //     chrome.tabs.sendMessage(tab.id, {
    //       command: "toggle",
    //     });
    //   });
    // });

    /** Open Extension in sperate window & resize current browser windows */
    var maxHeight, maxWidth;
    var leadzillaPopupWidth = 320;

    chrome.windows.getCurrent(function (currentWindow) {
      //alert(wind.id);
      maxWidth = window.screen.availWidth;
      maxHeight = window.screen.availHeight;

      console.log(currentWindow.state);

      //Info to exit window from fullscreen/maximize mode to normal mode
      var updateInfo1 = {
        state: "normal",
        //height: maxHeight,
      };

      //Info to give left margin of leadzillaPopupWidth & reduce window width by leadzillaPopupWidth
      var updateInfo2 = {
        left: 0,
        top: 0,
        width: maxWidth - leadzillaPopupWidth,
        height: maxHeight,
      };

      //exit fullscreen on current main window using maximize
      chrome.windows.update(currentWindow.id, updateInfo1);
      //Give left margin to move main window to right & also decrese width
      chrome.windows.update(currentWindow.id, updateInfo2);

      //open popup.html (with a fixed height and width) in new window
      chrome.windows.create(
        {
          url: chrome.runtime.getURL("popup.html"),
          type: "popup",
          height: maxHeight,
          width: leadzillaPopupWidth,
          top: 0,
          left: maxWidth-leadzillaPopupWidth,
        },
        function (win) {
          // win represents the Window object from windows API
          // Do this after opening

          /** exit fullscreen on current main window using maximize
           this is important to avoid opening extension as fullscreen */
          let chromeExtensionWindowId = win.id
          chrome.windows.update(chromeExtensionWindowId, updateInfo1); 
        }
      );
    });
  });
}
