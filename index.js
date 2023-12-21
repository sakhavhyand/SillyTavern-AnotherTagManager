// An extension that allows you to manage tags.
import { extension_settings } from '../../../extensions.js';
import { callPopup, getEntitiesList, getThumbnailUrl, default_avatar } from '../../../../script.js';
import { getTagsList } from '../../../tags.js';

const extensionName = 'SillyTavern-TagManager';
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

let popupState = null;
let savedPopupContent = null;
const defaultSettings = {};
let charsData = {};

/**
 * Asynchronously loads settings from `extension_settings.tag`,
 * filling in with default settings if some are missing.
 *
 * After loading the settings, it also updates the UI components
 * with the appropriate values from the loaded settings.
 */
async function loadSettings() {
    // Ensure extension_settings.timeline exists
    if (!extension_settings.tag) {
        console.log('Creating extension_settings.tag');
        extension_settings.tag = {};
    }

    // Check and merge each default setting if it doesn't exist
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (!extension_settings.tag.hasOwnProperty(key)) {
            console.log(`Setting default for: ${key}`);
            extension_settings.tag[key] = value;
        }
    }
}


function getCharBlock(item, id) {

    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }

    let html = `<div class="character_item flex-container char_select" chid="${id}" id="CharID${id}">
                    <div class="avatar" title="${item.avatar}">
                        <img src="${this_avatar}">
                    </div>
                    <div class="description">${item.name} : ${getTagsList(item.avatar).length}</div>
                </div>`;
    return html;
}

function fillDetails({item, id, type}) {

    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }
    let divDetailsTags = document.getElementById('char-details-tags');


    divDetailsTags.innerHTML = `<div class="character_item flex-container" chid="${id}" id="CharID${id}">
                                    <div class="avatar" title="${item.avatar}">
                                        <img src="${this_avatar}">
                                    </div>
                                    <div>${item.name}</div>
                                    <div>${getTagsList(item.avatar).map((t) => t.name)}</div>
                                </div>`;
    //document.getElementById('desc_zone').value = getDescription(char.id);
    document.getElementById('desc_zone').value = item.description;
}

function openPopup() {

    if (savedPopupContent) {
        console.log('Using saved popup content');
        // Append the saved content to the popup container
        callPopup('', 'text', '', { okButton: 'Close', wide: true, large: true })
            .then(() => {
                savedPopupContent = document.querySelector('.list-character-wrapper');
            });

        document.getElementById('dialogue_popup_text').appendChild(savedPopupContent);
        return;
    }

    charsData = getEntitiesList({ doFilter: false });

    const listLayout = popupState ? popupState : `
    <div class="list-character-wrapper flexFlowColumn" id="list-character-wrapper">
        <div class="character-list" id="character-list">
            ${charsData.filter(i => i.type === 'character').map((e) => getCharBlock(e.item, e.id)).join('')}
        </div>
        <hr>
        <div class="character-details" id="char-details" style="display:none">
            <div class="char-details-tags" id="char-details-tags"></div>
            <div class="divider"></div>
            <div class="char-details-desc" id="char-details-desc">
                <div class="desc_div">
                    <span data-i18n="Character Description">Description</span>
                </div>
                <textarea readonly id="desc_zone" class="desc_zone"></textarea>
            </div>
        </div>
        <hr>
    </div>
    `;

    // Call the popup with our list layout
    callPopup(listLayout, 'text', '', { okButton: 'Close', wide: true, large: true })
        .then(() => {
            savedPopupContent = document.querySelector('.list-character-wrapper');
        });
}

jQuery(async () => {
    // put our button in between external_import_button and rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#external_import_button').after('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openPopup();
    });

    $(document).on('click', '.char_select', async function () {
        const id = $(this).attr('chid');

        fillDetails(charsData.filter(i => i.id == id && i.type === 'character')[0]);

        document.getElementById('character-list').classList.remove('character-list');
        document.getElementById('character-list').classList.add('character-list-selected');
        document.getElementById('char-details').style.display = 'flex';
    });

    loadSettings();
});