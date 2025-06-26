const leftDiv = document.getElementById("leftDiv");

initializeClock();

async function initializeClock() {
    let clocktype = 'analog';
    let intervalId;
    // Retrieve current time and calculate initial angles
    var currentTime = new Date();
    var initialSeconds = currentTime.getSeconds();
    var initialMinutes = currentTime.getMinutes();
    var initialHours = currentTime.getHours();

    // Initialize cumulative rotations
    let cumulativeSecondRotation = initialSeconds * 6;
    let cumulativeMinuteRotation = initialMinutes * 6 + (initialSeconds / 10);
    let cumulativeHourRotation = (30 * initialHours + initialMinutes / 2);

    // Apply initial rotations (no need to wait 1s now)
    document.getElementById("second").style.transform = `rotate(${cumulativeSecondRotation}deg)`;
    document.getElementById("minute").style.transform = `rotate(${cumulativeMinuteRotation}deg)`;
    document.getElementById("hour").style.transform = `rotate(${cumulativeHourRotation}deg)`;

    function updateanalogclock() {
        var currentTime = new Date();
        var initialSeconds = currentTime.getSeconds();
        var initialMinutes = currentTime.getMinutes();
        var initialHours = currentTime.getHours();
        let secondreset = false;
        let hourreset = false;
        let minreset = false;

        // Initialize cumulative rotations
        let cumulativeSecondRotation = initialSeconds * 6; // 6° per second
        let cumulativeMinuteRotation = initialMinutes * 6 + (initialSeconds / 10); // 6° per minute + adjustment for seconds
        let cumulativeHourRotation = (30 * initialHours + initialMinutes / 2); // 30° per hour + adjustment for minutes

        if (secondreset) {
            document.getElementById("second").style.transition = "none";
            document.getElementById("second").style.transform = `rotate(0deg)`;
            secondreset = false;
            return;
        }
        if (minreset) {
            document.getElementById("minute").style.transition = "none";
            document.getElementById("minute").style.transform = `rotate(0deg)`;
            minreset = false;
            return;
        }
        if (hourreset) {
            document.getElementById("hour").style.transition = "none";
            document.getElementById("hour").style.transform = `rotate(0deg)`;
            hourreset = false;
            return;
        }
        if (cumulativeSecondRotation === 0) {
            document.getElementById("second").style.transition = "transform 1s ease";
            document.getElementById("second").style.transform = `rotate(361deg)`;
            secondreset = true;
        } else {
            document.getElementById("second").style.transition = "transform 1s ease";
            document.getElementById("second").style.transform = `rotate(${cumulativeSecondRotation}deg)`;
        }

        if (cumulativeMinuteRotation === 0) {
            document.getElementById("minute").style.transition = "transform 1s ease";
            document.getElementById("minute").style.transform = `rotate(361deg)`;
            minreset = true;
        } else if (minreset !== true) {
            document.getElementById("minute").style.transition = "transform 1s ease";
            document.getElementById("minute").style.transform = `rotate(${cumulativeMinuteRotation}deg)`;
        }

        if (cumulativeHourRotation === 0 && currentTime.getHours() === 0 && currentTime.getMinutes() === 0) {
            document.getElementById("hour").style.transition = "none"; // Instantly reset at midnight
            document.getElementById("hour").style.transform = `rotate(0deg)`;
            hourreset = true;
        } else if (hourreset !== true) {
            document.getElementById("hour").style.transition = "transform 1s ease";
            document.getElementById("hour").style.transform = `rotate(${cumulativeHourRotation}deg)`;
        }
        // Update date immediately
    }

    // Function to start the clock
    function startClock() {
        if (!intervalId) {
            intervalId = setInterval(updateanalogclock, 500);
        }
    }

    // Function to stop the clock
    function stopClock() {
        clearInterval(intervalId);
        intervalId = null; // Reset intervalId
    }

    // Initial clock display
    updateanalogclock();

    // Start or stop clocks based on clock type and visibility state
    if (clocktype === "digital") {
        updatedigiClock();
    } else if (clocktype === "analog") {
        if (document.visibilityState === "visible") {
            startClock();
        }
    }

    // Event listener for visibility change
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            startClock(); // Start the clock if the tab is focused
        } else {
            stopClock(); // Stop the clock if the tab is not focused
        }
    });

    const analogClock = document.getElementById("analogClock");
    analogClock.style.display = "block";
}
