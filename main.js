var rollButton = document.getElementById("rollButton");
var showStatsButton = document.getElementById("showStatsButton");
var statsOverlay = document.getElementById("statsOverlay");
var total = document.getElementById("total");
var totalNumber = 0;
var result = document.getElementById("result");
var statsVisible = false;

rollButton.addEventListener("click", function() {
	roll(resultsIntervalCallback, resultsFinalCallBack);
});

showStatsButton.addEventListener("click", function() {
	statsVisible = !statsVisible;
	if(statsVisible) {
		statsOverlay.classList.remove("hidden")
	} else {
		statsOverlay.classList.add("hidden")
	}
});


function resultsIntervalCallback(results) {
	let sum = results[0] + results[1];
	result.innerHTML = sum;
}


function resultsFinalCallBack(results) {
	let sum = results[0] + results[1];
	result.innerHTML = sum;
	updateTotalText();
	updateCountTextFor(sum);
	updateChances();
}

function updateTotalText() {
	totalNumber += 1;
	total.innerHTML = "Total: " + totalNumber;
}

function updateCountTextFor(result) {
	var el = document.getElementById("resultCount-"+result);
	var current = Number.parseInt(el.innerHTML);
	el.innerHTML = current + 1;
}

function updateChances() {
	for(let i = 2; i <= 12; i++) {
		var resultCountElement = document.getElementById("resultCount-"+i);
		var resultCount = Number.parseInt(resultCountElement.innerHTML);
		var chance = resultCount / totalNumber;
		var el = document.getElementById("resultChance-"+i);
		el.innerHTML = chance.toFixed(3);
	}
}

//Random distribution test
// setInterval(function() {
// 	roll(resultsIntervalCallback, resultsFinalCallBack);
// }, 4000)