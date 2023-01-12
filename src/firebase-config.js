// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  collection,
  where,
  addDoc,
  writeBatch
} from "firebase/firestore";
import axios from "axios";
import moment from "moment";
import "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAR933WHOV8rPS0LC-cOaCpfP4NYFMuTZc",
  authDomain: "leadzilla-4c8c9.firebaseapp.com",
  projectId: "leadzilla-4c8c9",
  storageBucket: "leadzilla-4c8c9.appspot.com",
  messagingSenderId: "149985000313",
  appId: "1:149985000313:web:ae31fbdd0562630ed74da8",
  measurementId: "G-M041H29TN4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

// const serverURL = process.env.REACT_APP_SERVER_URL;
const serverURL = "https://leadzilla.herokuapp.com";

//SignIn with google
export const signInWithGoogle = () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      // The signed-in user info.
      const user = result.user;
      console.log(user);
      createUserInFirestore(user.uid, user.email);
    })
    .catch((error) => {
      // Handle Errors here.
      console.log(error);
    });
};

//save user data
export const createUserInFirestore = async (
  firebaseUserUUID,
  firebaseUserEmail
) => {
  try {
    console.log("user exists, getting user document");
    const docSnap = await getDoc(doc(db, "users", `${firebaseUserUUID}`));
    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
    } else {
      // doc.data() will be undefined in this case
      console.log("No user data!, creating one");
      // Add a new document in collection "Users"
      await setDoc(doc(db, "users", `${firebaseUserUUID}`), {
        credits: 20,
        personalisationCredits: 4,
        base_credits: 0,
        base_ai_credits: 0,
        account: "business",
        salesforce: {
          instance_url: "",
          refresh_token: "",
          enabled: false,
        },
        email: `${firebaseUserEmail}`,
        firebase_auth_uuid: `${firebaseUserUUID}`,
        subscription_id: "none",
      });
    }
  } catch (error) {
    console.error("Error adding document: ", error);
  }
};

export const getUserInfo = async (firebaseUserUUID) => {
  const docSnap = await getDoc(doc(db, "users", `${firebaseUserUUID}`));
  let res = {
    "account": docSnap.data().account,
    "credits": docSnap.data().credits
  };

  return res;
};

export const deductCredit = async (firebaseAuthUUID, credit, type) => {

  if (credit <= 0) {
    return false;
  }

  if (type !== "ai" && type !== "contact") {
    return false;
  }

  let localAiCredit;
  let localContactCredit;
  let userDataRef;

  if (firebaseAuthUUID !== undefined) {
    const docSnap = await getDoc(doc(db, "users", firebaseAuthUUID));
    localAiCredit = docSnap.data().personalisationCredits;
    localContactCredit = docSnap.data().credits;
    userDataRef = doc(db, "users", firebaseAuthUUID);
  } else if (firebaseAuthUUID === undefined) {
    localContactCredit = localStorage.getItem("leadzilla_credits", "0");
    localAiCredit = localStorage.getItem("leadzilla_ai_credits", "0");
  }


  if (type === "ai" && localAiCredit > 0) {
    let newCredit = localAiCredit - credit;

    if (newCredit < 0) {
      return false;
    }

    if(firebaseAuthUUID !== undefined){
      // update credit in firebase db
      await updateDoc(userDataRef, {
        personalisationCredits: newCredit,
      })
    }

    localStorage.setItem("leadzilla_ai_credits", newCredit);
    return true;
  } else if (type === "contact" && localContactCredit > 0) {
    let newCredit = localContactCredit - credit;
    if (newCredit < 0) {
      return false;
    }

    if(firebaseAuthUUID !== undefined){
      // update credit in firebase db
      await updateDoc(userDataRef, {
        credits: newCredit,
      })
    }

    localStorage.setItem("leadzilla_credits", newCredit);
    return true;
  }
}

export const saveCSVFile = async (firebaseUserUUID, uploadedCSVFileName, scrapUrl) => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, "enrichment_csv_file_list"),
        where("firebase_auth_uuid", "==", firebaseUserUUID),
        where("fileName", "==", uploadedCSVFileName)
      )
    );

    // if such file is not saved already && incoming csv file is not empty, create csv file in list & start saving csv rows in seperate collection
    if (querySnapshot.docs.length === 0) {
      await addDoc(collection(db, "enrichment_csv_file_list"), {
        fileName: `${uploadedCSVFileName}`,
        enrichmentComplete: false,
        scrapComplete: false,
        scrapUrl: scrapUrl,
        isRunning: false,
        rowCount: `0`,
        firebase_auth_uuid: `${firebaseUserUUID}`,
        uploadedAt: moment().toDate(),
        uploadType: "beast_mode"
      });
    }
  } catch (error) {
    console.log("Failed while saving CSV file... ", error);
  }
};

export const saveCSVRowsForEnrichment = async (
  firebaseUserUUID,
  fileName,
  fileID,
  csvData
) => {

  if (csvData.length === 0) {
    return;
  }

  try {
    // check if this CSV File already exists in db
    const querySnapshot = await getDocs(
      query(
        collection(db, "enrichment_csv_file_list"),
        where("firebase_auth_uuid", "==", firebaseUserUUID),
        where("fileName", "==", fileName)
      )
    );

    // start saving csv rows in seperate collection
    if (querySnapshot.docs.length !== 0 && csvData.length !== 0) {
      // use firebase batch to upload csv file rows a seperate objects
      let batch = writeBatch(db);

      for (let i = 1; i <= csvData.length; i++) {
        let csvRow = csvData[i - 1]
        const csvFileRowRef = doc(collection(db, "enrichment_csv_file_rows"));

        batch.set(csvFileRowRef, {
          fileName: fileName,
          fullName: csvRow.fullName || "",
          firstName: csvRow.firstName || "",
          lastName: csvRow.lastName || "",
          jobTitle: csvRow.jobTitle || "",
          companyName: csvRow.companyName || "",
          companyLinkedInPageUrl: csvRow.companyLinkedInPageUrl || "",
          email: csvRow.emailId || "",
          salesNavProfileUrl: csvRow.salesNavProfileUrl || "",
          linkedInUrl: csvRow.uniqueLinkedinId || "",
          website: csvRow.website || "",
          emailStatus: csvRow.verificationStatus || "",
          phoneNumber: csvRow.phoneNumber || "",
          phoneNumbers: csvRow.phoneNumbers || "",
          phoneDirect: csvRow.phoneDirect || "",
          phoneCompany: csvRow.phoneCompany || "",
          phoneMobile: csvRow.phoneMobile || "",
          firebase_auth_uuid: firebaseUserUUID,
          enriched: false,
          scrapped: true
        });

        // check to prevent firebase error : "maximum 500 writes allowed per request"
        if (i % 500 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }

      await batch.commit();

      // update csv row count 
      const rowQuery = await getDocs(
        query(
          collection(db, "enrichment_csv_file_rows"),
          where("firebase_auth_uuid", "==", firebaseUserUUID),
          where("fileName", "==", fileName)
        )
      );
      let rowCount = rowQuery.docs.length;
      let fileDataRef = doc(db, "enrichment_csv_file_list", fileID);

      await updateDoc(fileDataRef, {
        rowCount: rowCount,
      })
    }
  } catch (err) {
    console.log("Failed while uploading csv file row for enrichment...");
    console.log(err);
  }
};

export const getPendingScrapUrls = async (firebaseUserUUID) => {
  const querySnapshot = await getDocs(
    query(
      collection(db, "enrichment_csv_file_list"),
      where("firebase_auth_uuid", "==", firebaseUserUUID),
      where("scrapComplete", "==", false)
    )
  );

  let scrapList = [];

  querySnapshot.docs.forEach((item) => {
    let obj = {
      "id": item.id,
      "fileName": item.data().fileName,
      "scrapUrl": item.data().scrapUrl,
    }
    scrapList.push(obj)
  })

  return scrapList;
};

export const filterScrappedUrl = async (firebaseUserUUID, fileName, list) => {
  let newList = [];

  const rowQuery = await getDocs(
    query(
      collection(db, "enrichment_csv_file_rows"),
      where("firebase_auth_uuid", "==", firebaseUserUUID),
      where("fileName", "==", fileName)
    )
  );

  list.forEach((item) => {
    let duplicate = false;
    let userUrl = item.salesNavProfileUrl;

    rowQuery.docs.forEach((itemDoc) => {
      let docUrl = itemDoc.data().salesNavProfileUrl;
      if (userUrl === docUrl) {
        duplicate = true;
        return;
      }
    })

    if (duplicate === false) {
      newList.push(item)
    }
  })

  return newList;
};

export const beastModePurchaseContact = async (list, leadzillaAccountType, creditCount, firebaseUserUUID, fileName, fileID) => {

  if (creditCount <= 0) {
    console.log("Beast mode contact purchase skipped. not enough credit!!");
    return;
  }

  const fetchProfile = async (firstName, lastName, companyName) => {
    let returnResponse = {};
    var data = {
      name: [`${firstName} ${lastName}`],
      title: [],
      companyName: [`${companyName}`],
      nameDomain: [],
      limit: 1,
      cursorMark: "",
    };

    try {
      await axios
        .post(`${serverURL}/enrichV2`, JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            // Autherization: "Bearer " + accessToken,
          },
        })
        .then((response) => {
          let res = response.data;
          let obj = {
            "primaryDomain": res.primaryDomain || "",
            "phoneNumber": res.phoneNumber || "",
            "phoneNumbers": res.phoneNumbers || "",
            "phoneDirect": res.phoneDirect || "",
            "phoneCompany": res.phoneCompany || "",
            "phoneMobile": res.phoneMobile || "",
            "contactId": res.id || "",
          };

          returnResponse = { ...obj };
        })
        .catch((error) => {
          console.log(error);
        });
    } catch (err) {
      console.log(err);
    }

    return returnResponse;
  }

  const purchaseContact = async (
    contactId,
    firstName,
    lastName,
    companyName,
    companyLinkedInPageUrl,
    salesNavProfileUrl,
  ) => {
    let returnResponse = {};

    await axios
      .get(
        `${serverURL}/purchaseV2?accountType=${leadzillaAccountType}&contactId=${contactId}&firstName=${firstName}&lastName=${lastName}&companyName=${companyName}&companyLinkedInPageUrl=${companyLinkedInPageUrl}&linkedInProfileUrl=${salesNavProfileUrl}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      )
      .then((response) => {
        let tempObj = {
          "emailId": response.data.emailAddress || "",
          "website": response.data.emailAddress?.split("@")[response.data.emailAddress?.split("@").length - 1],
          "verificationStatus": response.data?.emailStatus || "",
          "phoneNumber": response.data?.phoneNumber || "",
          "phoneNumbers": response.data?.phoneNumbers || [],
          "phoneDirect": response.data?.phoneDirect || "",
          "phoneCompany": response.data?.phoneCompany || "",
          "phoneMobile": response.data?.phoneMobile || ""
        }

        // remove undefined and "none" values
        for (let keys in tempObj) {
          let value = tempObj[keys];
          if (value === "none" || value === undefined) {
            tempObj[keys] = "";
          }
        }

        returnResponse = { ...tempObj };
      })
      .catch((error) => {
        console.log(error);
      });
    return returnResponse;
  }

  const evaluateCredit = (purchaseObj) => {
    let count = 0;

    if (purchaseObj.emailId !== "") {
      count += 2;
    }

    if (
      purchaseObj.phoneNumber !== "" ||
      purchaseObj.phoneNumbers.length !== 0 ||
      purchaseObj.phoneDirect !== "" ||
      purchaseObj.phoneCompany !== "" ||
      purchaseObj.phoneMobile !== ""
    ) {
      count += 2;
    }

    return count;
  }

  let returnResponseList = [];

  for (let i = 0; i < list.length; i++) {
    let item = list[i]
    let { firstName, lastName, companyName, companyLinkedInPageUrl, salesNavProfileUrl } = item;

    if (creditCount <= 0) {
      console.log("Beast mode contact purchase skipped. not enough credit!!");
      break;
    }

    // get contactID, required for contact purchase
    let itemRes = await fetchProfile(firstName, lastName, companyName);
    let { contactId } = itemRes;

    // purchase contact
    let purchaseResponse = await purchaseContact(
      contactId,
      firstName,
      lastName,
      companyName,
      companyLinkedInPageUrl,
      salesNavProfileUrl,
    )

    // append required contact data to list
    item.emailId = purchaseResponse.emailId;
    item.website = purchaseResponse.website;
    item.verificationStatus = purchaseResponse.verificationStatus;
    item.phoneNumber = purchaseResponse.phoneNumber;
    item.phoneNumbers = purchaseResponse.phoneNumbers;
    item.phoneDirect = purchaseResponse.phoneDirect;
    item.phoneCompany = purchaseResponse.phoneCompany;
    item.phoneMobile = purchaseResponse.phoneMobile;

    returnResponseList.push(item);

    console.log("Saving row number ", i + 1);
    await saveCSVRowsForEnrichment(firebaseUserUUID, fileName, fileID, [item]);

    // deduct credit based on purchased email and phone numbers
    let evaluatedCredit = evaluateCredit(purchaseResponse)
    await deductCredit(firebaseUserUUID, evaluatedCredit, "contact");
  }

  return returnResponseList;
};

export const getCommentForLinkedInPost = async (para) => {
  let data = {
    "linkedInPost": para.linkedInPost
  }

  let response = "";

  await axios
    .post(`${serverURL}/writeCommentOnLinkedInPost`, JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
    .then((res) => {
      let formattedResponse = res.data.linkedInComment;
      response = formattedResponse.slice(2, formattedResponse.length)
    })
    .catch((err) => {
      console.log("Failed while comment generation from post text");
      console.log(err);
    })

  return response;
}