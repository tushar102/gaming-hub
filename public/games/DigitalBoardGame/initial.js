let numPvP;

const setNumPvP = (num) => {
    numPvP = num;
    window.numPvP = numPvP; // Attach numPvP to the global window object

    // Inject a new script element
    const script = document.createElement('script');
    script.src = './script.js'; // Replace with the actual path
    script.type = 'text/javascript';
    script.async = true;

    document.body.appendChild(script);
};
