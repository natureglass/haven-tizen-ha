/* Haven shell settings. Copy this file to shell-config.js and edit it before the first install.
 * shell-config.js is in .gitignore because it holds your token.
 *
 * base     The folder on Home Assistant that holds design/ and wallpapers/.
 *          /config/www/haven/ on HA is served at http://<HA-IP>:8123/local/haven/
 *          Can also be changed later on the TV (Settings > Home Assistant address).
 * haToken  A long-lived access token for the sensor and light widgets.
 *          In Home Assistant: your profile > Security > Long-lived access tokens > Create.
 *          Keep this file out of git and don't copy it to /config/www: the token can do
 *          anything your HA user can do.
 * haUrl    Leave empty: it is taken from "base" (http://<HA-IP>:8123). Set it only if the
 *          API lives somewhere else, e.g. 'https://ha.example.lan'.
 */
window.HAVEN_SHELL_CONFIG = {
    base: 'http://192.168.1.10:8123/local/haven/',
    haToken: '',
    haUrl: '',
    checkEveryMinutes: 15,     // design update checks while Haven is on screen
    applyAfterIdleSeconds: 20  // apply a downloaded design once the remote has been idle this long
};
