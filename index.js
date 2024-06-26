// An extension that allows you to manage characters.
import { setCharacterId, setMenuType } from '../../../../script.js';
import { resetScrollHeight } from '../../../utils.js';
import { createTagInput } from '../../../tags.js';
import { editChar, dupeChar, renameChar, exportChar } from './src/atm_characters.js';

const getTokenCount = SillyTavern.getContext().getTokenCount;
const getThumbnailUrl = SillyTavern.getContext().getThumbnailUrl;
const callPopup = SillyTavern.getContext().callPopup;
const eventSource = SillyTavern.getContext().eventSource;
const event_types = SillyTavern.getContext().eventTypes;
const characters = SillyTavern.getContext().characters;
const tagMap = SillyTavern.getContext().tagMap;
const tagList = SillyTavern.getContext().tags;

// Initializing some variables
const extensionName = 'SillyTavern-AnotherTagManager';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 100);
const editCharDebounced = debounce( (data) => { editChar(data); }, 1000);
let selectedId;
let selectedChar;
let mem_menu;
let mem_avatar;
let displayed;
let sortOrder = 'asc';
let sortData = 'name';
let searchValue = '';

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// Function to get the ID of a character using its avatar
function getIdByAvatar(avatar){
    const index = characters.findIndex(character => character.avatar === avatar);
    return index !== -1 ? String(index) : undefined;
}

// Function to generate an Array for the selected character alternative greetings
function generateGreetingArray() {
    const textareas = document.querySelectorAll('.altGreeting_zone');
    const greetingArray = [];

    textareas.forEach(textarea => {
        greetingArray.push(textarea.value);
    });
    return greetingArray;
}

// Add an event listeners to all alternative greetings textareas displayed
function addAltGreetingsTrigger(){
    document.querySelectorAll('.altGreeting_zone').forEach(textarea => {
        textarea.addEventListener('input', (event) => {saveAltGreetings(event);});
    });
}

// Function to sort the character array based on specified property and order
function sortCharAR(chars, sort_data, sort_order) {
    return chars.sort((a, b) => {
        let comparison = 0;

        switch (sort_data) {
            case 'name':
                comparison = a[sort_data].localeCompare(b[sort_data]);
                break;
            case 'tags':
                comparison = tagMap[a.avatar].length - tagMap[b.avatar].length;
                break;
            case 'date_last_chat':
                comparison = b[sort_data] - a[sort_data];
                break;
            case 'date_added':
                comparison = b[sort_data] - a[sort_data];
                break;
        }

        return sort_order === 'desc' ? comparison * -1 : comparison;
    });
}

// Function to generate the HTML block for a character
function getCharBlock(avatar) {
    const id = getIdByAvatar(avatar);
    const avatarThumb = getThumbnailUrl('avatar', avatar);

    const parsedThis_avatar = selectedChar !== undefined ? selectedChar : undefined;
    const charClass = (parsedThis_avatar !== undefined && parsedThis_avatar === avatar) ? 'char_selected' : 'char_select';

    return `<div class="character_item ${charClass}" chid="${id}" avatar="${avatar}" id="CharDID${id}" title="[${characters[id].name} - Tags: ${tagMap[avatar].length}]">
                    <div class="avatar_item">
                        <img src="${avatarThumb}" alt="${characters[id].avatar}">
                    </div>
                    <div class="char_name">
                        <div class="char_name_block">
                            <span>${characters[id].name} : ${tagMap[avatar].length}</span>
                        </div>
                    </div>
                </div>`;
}

// Function to generate the HTML for displaying a tag
function displayTag( tagId ){
    if (tagList.find(tagList => tagList.id === tagId)) {
        const name = tagList.find(tagList => tagList.id === tagId).name;
        const color = tagList.find(tagList => tagList.id === tagId).color;

        if (tagList.find(tagList => tagList.id === tagId).color2) {
            const color2 = tagList.find(tagList => tagList.id === tagId).color2;

            return `<span id="${tagId}" class="tag" style="background-color: ${color}; color: ${color2};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark tag_remove"></i>
                </span>`;
        } else {
            return `<span id="${tagId}" class="tag" style="background-color: ${color};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark tag_remove"></i>
                </span>`;
        }
    }
    else { return ''; }
}

// Function to Display the AltGreetings if they exists
function displayAltGreetings(item) {
    let altGreetingsHTML = '';

    if(item.length === 0){
        return '<span>Nothing here but chickens!!</span>';
    }
    else {
        for (let i = 0; i < item.length; i++) {
            let greetingNumber = i + 1;
            altGreetingsHTML += `<div class="inline-drawer">
                <div id="altGreetDrawer${greetingNumber}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <strong>
                        Greeting #
                        <span class="greeting_index">${greetingNumber}</span>
                    </strong>
                    <span class="tokens_count">Tokens: ${getTokenCount(item[i])}</span>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight">${item[i]}</textarea>
                </div>
            </div>`;
        }
        return altGreetingsHTML;
    }
}

// Function to save added/edited/deleted alternative greetings
function saveAltGreetings(event = null){
    const greetings = generateGreetingArray();
    const update = {
        avatar: selectedChar,
        data: {
            alternate_greetings: greetings,
        },
    };
    editCharDebounced(update);
    // Update token count if necessary
    if (event) {
        const textarea = event.target;
        const tokensSpan = textarea.closest('.inline-drawer-content').previousElementSibling.querySelector('.tokens_count');
        tokensSpan.textContent = `Tokens: ${getTokenCount(textarea.value)}`;
    }
}

// Function to display a new alternative greeting block
function addAltGreeting(){
    const drawerContainer = document.getElementById('altGreetings_content');

    // Determine the new greeting index
    const greetingIndex = drawerContainer.getElementsByClassName('inline-drawer').length + 1;

    // Create the new inline-drawer block
    const altGreetingDiv = document.createElement('div');
    altGreetingDiv.className = 'inline-drawer';
    altGreetingDiv.innerHTML = `<div id="altGreetDrawer${greetingIndex}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <strong>
                        Greeting #
                        <span class="greeting_index">${greetingIndex}</span>
                    </strong>
                    <span class="tokens_count">Tokens: 0</span>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight"></textarea>
                </div>
            </div>`;

    // Add the new inline-drawer block
    drawerContainer.appendChild(altGreetingDiv);

    // Add the event on the textarea
    altGreetingDiv.querySelector(`.altGreeting_zone`).addEventListener('input', (event) => {
        saveAltGreetings(event);
    });

    // Save it
    saveAltGreetings();
}

// Function to delete an alternative greetings block
function delAltGreeting(index, inlineDrawer){
    // Delete the AltGreeting block
    inlineDrawer.remove();

    // Update the others AltGreeting blocks
    $('.altgreetings-drawer-toggle').each(function() {
        const currentIndex = parseInt($(this).find('.greeting_index').text());
        if (currentIndex > index) {
            $(this).find('.greeting_index').text(currentIndex - 1);
            $(this).attr('id', `altGreetDrawer${currentIndex - 1}`);
        }
    });

    // Save it
    saveAltGreetings();
}

// Function to fill details in the character details block
function fillDetails(avatar) {
    const char = characters[getIdByAvatar(avatar)];
    const this_avatar = getThumbnailUrl('avatar', char.avatar);

    $('#avatar_title').attr('title', char.avatar);
    $('#avatar_img').attr('src', this_avatar);
    document.getElementById('ch_name_details').innerHTML = char.name;
    document.getElementById('crea_comment').innerHTML = char.creatorcomment !== undefined ? char.creatorcomment : char.data.creator_notes;
    document.getElementById('desc_Tokens').innerHTML = `Tokens: ${getTokenCount(char.description)}`;
    $('#desc_zone').val(char.description);
    document.getElementById('firstMess_tokens').innerHTML = `Tokens: ${getTokenCount(char.first_mes)}`;
    $('#firstMes_zone').val(char.first_mes);
    document.getElementById('altGreetings_number').innerHTML = `Numbers: ${char.data.alternate_greetings.length}`;
    document.getElementById('tag_List').innerHTML = `${tagMap[char.avatar].map((tag) => displayTag(tag)).join('')}`;
    createTagInput('#input_tag', '#tag_List', { tagOptions: { removable: true } });
    document.getElementById('altGreetings_content').innerHTML = displayAltGreetings(char.data.alternate_greetings);

    addAltGreetingsTrigger()
}

// Function to refresh the character list based on search and sorting parameters
function refreshCharList() {

    let filteredChars = [];
    const charactersCopy = [...SillyTavern.getContext().characters];

    if (searchValue !== '') {
        const searchValueLower = searchValue.toLowerCase();

        // Find matching tag IDs based on searchValue
        const matchingTagIds = tagList
            .filter(tag => tag.name.toLowerCase().includes(searchValueLower))
            .map(tag => tag.id);

        // Filter characters by description, name, creatorcomment, or tag
        filteredChars = charactersCopy.filter(item => {
            const matchesText = item.description?.toLowerCase().includes(searchValueLower) ||
                item.name?.toLowerCase().includes(searchValueLower) ||
                item.creatorcomment?.toLowerCase().includes(searchValueLower);

            const matchesTag = (tagMap[item.avatar] || []).some(tagId => matchingTagIds.includes(tagId));

            return matchesText || matchesTag;
        });
    }

    const sortedList = sortCharAR((filteredChars.length === 0 ? charactersCopy : filteredChars), sortData, sortOrder);
    document.getElementById('character-list').innerHTML = sortedList.map((item) => getCharBlock(item.avatar)).join('');
    $('#charNumber').empty().append(`Total characters : ${charactersCopy.length}`);
}

// Function to display the selected character
function selectAndDisplay(id, avatar) {

    // Check if a visible character is already selected
    if(typeof selectedId !== 'undefined' && document.getElementById(`CharDID${selectedId}`) !== null){
        document.getElementById(`CharDID${selectedId}`).classList.replace('char_selected','char_select');
    }
    setMenuType('character_edit');
    selectedId = id;
    selectedChar = avatar;
    setCharacterId(getIdByAvatar(avatar));

    $('#atm_export_format_popup').hide();

    fillDetails(avatar);

    document.getElementById(`CharDID${id}`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.display = 'block';
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to close the details panel
function closeDetails() {
    setCharacterId(getIdByAvatar(mem_avatar));
    selectedChar = undefined;

    $('#atm_export_format_popup').hide();

    document.getElementById(`CharDID${selectedId}`)?.classList.replace('char_selected','char_select');
    document.getElementById('char-details').style.display = 'none';
    document.getElementById('char-sep').style.display = 'none';
    selectedId = undefined;
}

// Function to build the modal
function openModal() {

    // Memorize some global variables
    if (SillyTavern.getContext().characterId !== undefined && SillyTavern.getContext().characterId >= 0) {
        mem_avatar = characters[SillyTavern.getContext().characterId].avatar;
    } else {
        mem_avatar = undefined;
    }
    mem_menu = SillyTavern.getContext().menuType;
    displayed = true;

    // Sort the characters
    let charsList = sortCharAR([...SillyTavern.getContext().characters], sortData, sortOrder);

    // Display the modal with our list layout
    $('#atm_popup').toggleClass('wide_dialogue_popup large_dialogue_popup');
    $('#character-list').empty().append(charsList.map((item) => getCharBlock(item.avatar)).join(''));
    $('#charNumber').empty().append(`Total characters : ${charsList.length}`);
    $('#atm_shadow_popup').css('display', 'block').transition({
        opacity: 1,
        duration: 125,
        easing: 'ease-in-out',
    });

    // Add listener to refresh the display on characters edit
    eventSource.on(event_types.CHARACTER_EDITED, function () {
        if (displayed) {
            refreshCharListDebounced();
        }
    });
    // Add listener to refresh the display on tags edit
    eventSource.on('character_page_loaded', function () {
        if (displayed){
            refreshCharListDebounced();
        }});
    // Add listener to refresh the display on characters delete
    eventSource.on('characterDeleted', function () {
        if (displayed){
            closeDetails();
            refreshCharListDebounced();
        }});
    // Add listener to refresh the display on characters duplication
    eventSource.on(event_types.CHARACTER_DUPLICATED, function () {
        if (displayed) {
            refreshCharListDebounced();
        }
    });

    const charSortOrderSelect = document.getElementById('char_sort_order');
    Array.from(charSortOrderSelect.options).forEach(option => {
        const field = option.getAttribute('data-field');
        const order = option.getAttribute('data-order');

        option.selected = field === sortData && order === sortOrder;
    });
}

jQuery(async () => {

    // Create the shadow div
    const modalHtml = await $.get(`${extensionFolderPath}/modal.html`);
    $('#background_template').after(modalHtml);

    let atmExportPopper = Popper.createPopper(document.getElementById('atm_export_button'), document.getElementById('atm_export_format_popup'), {
        placement: 'left',
    });

    // Put the button before rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#rm_button_group_chats').before('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openModal();
    });

    // Trigger when a character is selected in the list
    $(document).on('click', '.char_select', function () {
        selectAndDisplay($(this).attr('chid'), $(this).attr('avatar'));
    });

    // Trigger when the sort dropdown is used
    $(document).on('change', '#char_sort_order' , function () {
        sortData = $(this).find(':selected').data('field');
        sortOrder = $(this).find(':selected').data('order');
        refreshCharListDebounced();
    });

    // Trigger when the search bar is used
    $(document).on('input','#char_search_bar', function () {
        searchValue = String($(this).val()).toLowerCase();
        refreshCharListDebounced();
    });

    // Trigger when clicking on the separator to close the character details
    $(document).on('click', '#char-sep', function () {
        closeDetails();
    });

    // Trigger when clicking on a drawer to open/close it
    $(document).on('click', '.altgreetings-drawer-toggle', function () {
        const icon = $(this).find('.idit');
        icon.toggleClass('down up');
        icon.toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
        $(this).closest('.inline-drawer').children('.inline-drawer-content').stop().slideToggle();

        // Set the height of "autoSetHeight" textareas within the inline-drawer to their scroll height
        $(this).closest('.inline-drawer').find('.inline-drawer-content textarea.autoSetHeight').each(function () {
            resetScrollHeight($(this));
        });
    });

    // Trigger when the modal is closed to reset some global parameters
    $('#atm_popup_close').click( function () {
        closeDetails();
        setCharacterId(getIdByAvatar(mem_avatar));
        setMenuType(mem_menu);
        mem_avatar = undefined;

        $('#atm_shadow_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $('#atm_shadow_popup').css('display', 'none');
            $('#atm_popup').removeClass('large_dialogue_popup wide_dialogue_popup');
        }, 125);
        displayed = false;
    });

    // Import character by file
    $('#atm_character_import_button').click(function () {
        $('#character_import_file').click();
    });

    // Import character by URL
    $('#atm_external_import_button').click(function () {
        $('#external_import_button').click();
    });

    // Import character by file
    $('#atm_rename_button').click(async function () {
        const charID = getIdByAvatar(selectedChar);
        const newName = await callPopup('<h3>New name:</h3>', 'input', characters[charID].name);
        renameChar(selectedChar, charID, newName);
    });

    // Export character
    $('#atm_export_button').click(function () {
        $('#atm_export_format_popup').toggle();
        atmExportPopper.update();
    });

    $(document).on('click', '.atm_export_format', function () {
        const format = $(this).data('format');
        if (!format) {
            return;
        }
        exportChar(format, selectedChar);
    });

    // Duplicate character
    $('#atm_dupe_button').click(async function () {
        if (!selectedChar) {
            toastr.warning('You must first select a character to duplicate!');
            return;
        }

        const confirmMessage = `
            <h3>Are you sure you want to duplicate this character?</h3>
            <span>If you just want to start a new chat with the same character, use "Start new chat" option in the bottom-left options menu.</span><br><br>`;

        const confirm = await callPopup(confirmMessage, 'confirm');

        if (!confirm) {
            console.log('User cancelled duplication');
            return;
        }
        await dupeChar(selectedChar);
    });

    // Delete character
    $('#atm_delete_button').click(function () {
        $('#delete_button').click();
    });

    // Update character description
    $('#desc_zone').on('input', function () {
        const update = {
            avatar: selectedChar,
            description: this.value,
            data: {
                description: this.value,
            },
        };
        editCharDebounced(update);
    });

    // Update character first message
    $('#firstMes_zone').on('input', function () {
        const update = {
            avatar: selectedChar,
            first_mes: this.value,
            data: {
                first_mes: this.value,
            },
        };
        editCharDebounced(update);
    });

    // Add a new alternative greetings
    $(document).on('click', '.fa-circle-plus', async function (event) {
        event.stopPropagation();
        addAltGreeting();
    });

    // Delete an alternative greetings
    $(document).on('click', '.fa-circle-minus', function (event) {
        event.stopPropagation();
        const inlineDrawer = this.closest('.inline-drawer');
        const greetingIndex = parseInt(this.closest('.altgreetings-drawer-toggle').querySelector('.greeting_index').textContent);
        delAltGreeting(greetingIndex, inlineDrawer);
    });
});
