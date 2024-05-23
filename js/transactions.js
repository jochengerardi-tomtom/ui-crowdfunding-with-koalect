async function transactionData(groupName) {
    // promise of sheet data
    const sheetData = await fetch('https://sheets.googleapis.com/v4/spreadsheets/1ItisRtpvDkF2m0yXG-8u-yF6D1hokvRBNmFIDbcOvL0/values/' + 
                                groupName + 
                                '!A2:C2000' + 
                                '?key=AIzaSyAVzI5xq3pz2P-O1u6MUIK4ZJVvBQmedHQ');
    // wait until resolved                                
    const sheetJson =  await sheetData.json();
    if (sheetJson.values === undefined) {
        return [];
    }
    return sheetJson.values;
}

async function transactionDataWithRetry(groupName, maxRetries = 5, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const sheetData = await fetch('https://sheets.googleapis.com/v4/spreadsheets/1ItisRtpvDkF2m0yXG-8u-yF6D1hokvRBNmFIDbcOvL0/values/' + 
                                    groupName + 
                                    '!A2:C2000' + 
                                    '?key=AIzaSyAVzI5xq3pz2P-O1u6MUIK4ZJVvBQmedHQ');
            const sheetJson =  await sheetData.json();
            if (sheetJson.values === undefined) {
                throw new Error('No values in response');
            }
            return sheetJson.values;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries reached. Request failed.');
}

async function crowdfundingData(slug) {
    var dataQueryStructure = 
    `query ListForms {
          listForms(slug: "` + slug + `") {
              nodes {
                  goalAmount
                  taxReceiptAllowed
                  updatedAt
                  id
                  currentAmount
                  contributorsCount
                  contributionsCount
              }
          }
      }`

    var dataQuery = JSON.stringify({ query: dataQueryStructure })
    const response = await fetch('https://v2.koalect.com/databus/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'KEY kreh5vnPdeH1vbxxksk7qQ'
        'Authorization': 'KEY 9-bfzr4q0RvqGBfaEWA4pw'
      },
      body: dataQuery,
    });
    const crowdfundingData = await response.json();
    return crowdfundingData.data.listForms.nodes[0];

}

async function fetchAllData() {
    const bedrijvenData = await transactionDataWithRetry("bedrijven");
    const personenData = await transactionDataWithRetry("personen");
    // const koalectData = await crowdfundingData("test-optin-sms-edge");
    const koalectData = await crowdfundingData("chiro-lourdes-meisjes-bouwt");
    const newBedrijven = bedrijvenData.filter(item => validItem(item)).map(item => [item[0], item[1], item[2], "B"])
    const newPersonen = personenData.filter(item => validItem(item)).map(item => [item[0], item[1], item[2], "P"])
    return { 
        bedrijven: newBedrijven, 
        personen: newPersonen, 
        crowdfunding: koalectData,
        merged: mergeAndSortTransactionData(newBedrijven, newPersonen) 
    };
}

function validItem(item) {
    return item[0] != null && item[1] != null && item[2] != null;
}

function mergeAndSortTransactionData(bedrijvenData, personenData) {
    const mergedData = bedrijvenData.concat(personenData);
    return mergedData.sort((a, b) => createDateFromFormat(b[2]) - createDateFromFormat(a[2]));
}
function totalAmountCollected(data) {
    const totalAmount =  data.map(donation => parseInt(donation[1]))
                             .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    return [ data.length, totalAmount ] 
}

function createDateFromFormat(dateString) {
    if (dateString == null) {
        // set default date
        dateString = "17/5/2024";
    }
    const parts = dateString.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

export { transactionData, crowdfundingData, fetchAllData, totalAmountCollected };