function updatePercentageComplete() {
    var filledTextboxes = 0;
            var checkedBoxes = 0;
            
            inputLines.forEach((item) =>{
              if (item.value.length > 0 ){
                filledTextboxes++
            }
            });
            
            checkboxList.forEach((item)=>{
                if(item.checked){
                    checkedBoxes++
                    console.log(item)
            }})
            var percentageComplete = Math.round((checkedBoxes/filledTextboxes) * 100)
            console.log(percentageComplete)
            if(percentageComplete){
            document.querySelector(".progress-container p").innerHTML = percentageComplete + "%";
            }else{
                document.querySelector(".progress-container p").innerHTML =  "0%";
            }
}

//js for home.js
if(document.querySelector("body").classList.contains("home")){
var squareList = document.querySelectorAll(".background-square")
squareList.forEach((item)=>{
    setTimeout(()=>{
    item.classList.add("square-animation")
    }, (Math.random() * 70000))
})




}
if( document.querySelector("body").classList.contains("notebook")){
   
//confetti
const canvas = document.querySelector("#confetti-canvas")
const jsConfetti = new JSConfetti({ canvas })


var inputLines = document.querySelectorAll(".text-box");

//toggle checkbox visibility when text is entered into textbox
inputLines.forEach((item) =>{
var nameValue = item.getAttribute("name");
var lineNumber = nameValue.substring(nameValue.indexOf("-") + 1 );
var relatedCheckBox = document.querySelector(`#checkbox-${lineNumber}`);
item.value = item.value.trim()

if (item.value.length > 0){
    relatedCheckBox.classList.remove("hidden")
}

item.addEventListener("keyup", (event) => {
   if (item.value.length > 0){
       relatedCheckBox.classList.remove("hidden");
       updatePercentageComplete();
        
   }else{
       relatedCheckBox.classList.add("hidden");
   }
})
})


//event addEventListener to change percentage complete

var checkboxList = document.querySelectorAll(".checkbox")

    checkboxList.forEach((item)=>{
        item.addEventListener("click", (event)=>{
            if(event.target.checked){
                jsConfetti.addConfetti();
            };

            updatePercentageComplete();
        });
    });

updatePercentageComplete()

}
                         
