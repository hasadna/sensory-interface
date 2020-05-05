/**
 * @param {string} name
 * @returns {string}
 */
const getQueryParam = (name) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(name);
};
/**
 * @param {string} name
 * @param {string} value
 */
const setQueryParam = (name, value) => {
    let urlParams = new URLSearchParams(window.location.search);
    urlParams.set(name, value);
    urlParams.sort();
    window.history.pushState('Sensory interface', 'Sensory interface', window.location.pathname + '?' + urlParams.toString());
};
/**
 * Note, code is not currently used
 * @param {string} name
 */
const deleteQueryParam = (name) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    urlParams.delete(name);
    window.history.pushState('Sensory interface', 'Sensory interface', window.location.pathname + '?' + urlParams.toString());
};
/**
 * @param {string} language
 */
const changeLanguage = (language) => {
    document.getElementById('language-popup').setAttribute('modal', 'toggle');
    console.log(language);
    setLanguage(language);
    if (language === 'he') {
        document.body.setAttribute('dir', 'rtl');
        if (!document.getElementById('aboutP1').classList.contains('text-right')) {
            document.getElementsByTagName('H3')[0].classList.toggle('text-right');
            document.getElementById('aboutP1').classList.toggle('text-right');
            document.getElementById('aboutP2').classList.toggle('text-right');
            document.getElementById('aboutP3').classList.toggle('text-right');
        }
    }
    else {
        if (language === 'en') {
            document.body.setAttribute('dir', 'ltr');
            if (document.getElementById('aboutP1').classList.contains('text-right')) {
                document.getElementsByTagName('H3')[0].classList.toggle('text-right');
                document.getElementById('aboutP1').classList.toggle('text-right');
                document.getElementById('aboutP2').classList.toggle('text-right');
                document.getElementById('aboutP3').classList.toggle('text-right');
            }
        }
    }
};
//# sourceMappingURL=app.js.map