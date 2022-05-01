import Search from "./modules/search.js";
import Chat from "./modules/chat.js";
import Registration from "./modules/registration.js";

if (document.querySelector('#registration-form')) {
    new Registration();
}
if (document.querySelector(".header-search-icon")) {
    new Search();
}
if (document.querySelector("#chat-wrapper")) {
    new Chat();
}