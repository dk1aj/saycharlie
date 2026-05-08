/*
 * # Copyright (c) 2024 by Silviu Stroe (brainic.io)
 * #
 * # This program is free software: you can redistribute it and/or modify
 * # it under the terms of the GNU General Public License as published by
 * # the Free Software Foundation, either version 3 of the License, or
 * # (at your option) any later version.
 * #
 * # This program is distributed in the hope that it will be useful,
 * # but WITHOUT ANY WARRANTY; without even the implied warranty of
 * # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * # GNU General Public License for more details.
 * #
 * # You should have received a copy of the GNU General Public License
 * # along with this program. If not, see <http://www.gnu.org/licenses/>.
 * #
 * # Created on 5/16/24, 8:44 PM
 * #
 * # Author: Silviu Stroe
 */

const socket = io();
let timerInterval = null;
let startTime = null;
const timerElement = document.getElementById('talkerTimer');  // Declare once, use throughout
const lastTalkerElement = document.getElementById('lastTalker');
const talkerTgElement = document.getElementById('talkerTg');

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('update_last_talker', async (talker) => {
    const talker_callsign = talker['callsign'];
    try {
        // Fetch the name using the async function
        const name = await fetchName(talker_callsign);

        if (!talker['stopped']) {
            const groupName = await getGroupName(talker['tg_number']);
            lastTalkerElement.replaceChildren(
                createTalkerLabel("Current Talker:"),
                document.createTextNode(" "),
                createTalkerDetails(talker_callsign, name)
            );
            renderTalkGroup(talker['tg_number'], groupName);
            startTime = parseDateTime(talker['start_date_time']).getTime();
            startTimer();
        } else {
            const groupName = await getGroupName(talker['tg_number']);
            lastTalkerElement.replaceChildren(
                createTalkerLabel("Prev Talker:"),
                document.createTextNode(" "),
                createTalkerDetails(talker_callsign, name)
            );
            renderTalkGroup(talker['tg_number'], groupName);
            stopTimer();
            displayTalkDuration(talker.duration || 0);  // Display duration or reset if undefined
        }
    } catch (error) {
        console.error('Failed to fetch name:', error);
        // Handle the error by updating the UI appropriately
        lastTalkerElement.replaceChildren(
            createTalkerLabel(talker['stopped'] ? "Prev Talker:" : "Current Talker:"),
            document.createTextNode(" " + talker_callsign + " (Failed to fetch name)")
        );
        renderTalkGroup(talker['tg_number'], '');
        if (!talker['stopped']) {
            startTimer();
        } else {
            stopTimer();
            displayTalkDuration(talker.duration || 0);
        }
    }
});

function createTalkerLabel(text) {
    const label = document.createElement('span');
    label.style.fontSize = '0.75em';
    label.style.opacity = '0.75';
    label.textContent = text;
    return label;
}

function createTalkerDetails(callsign, name) {
    const details = document.createElement('span');
    details.style.display = 'inline-flex';
    details.style.flexDirection = 'column';
    details.style.verticalAlign = 'top';

    const callLine = document.createElement('span');
    callLine.textContent = callsign;

    const nameLine = createTalkerLabel(name || '###');
    nameLine.style.display = 'block';

    details.append(callLine, nameLine);
    return details;
}

function renderTalkGroup(tgNumber, groupName) {
    if (!talkerTgElement) {
        return;
    }
    const tgValue = document.createElement('span');
    tgValue.textContent = tgNumber || '-';

    const children = [
        createTalkerLabel("TG#:"),
        document.createTextNode(" "),
        tgValue
    ];

    if (groupName) {
        const groupNameLine = createTalkerLabel(groupName);
        groupNameLine.style.display = 'block';
        children.push(groupNameLine);
    }

    talkerTgElement.replaceChildren(...children);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        updateTimerDisplay(Date.now() - startTime);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimerDisplay(elapsedTime) {
    let minutes = Math.floor(elapsedTime / 60000);
    let seconds = Math.floor((elapsedTime % 60000) / 1000);
    renderDuration(formatDuration(minutes, seconds));
}

function displayTalkDuration(duration) {
    if (!duration) {
        renderDuration("0:00");
    } else {
        let minutes = Math.floor(duration / 60);
        let seconds = Math.floor(duration % 60);
        renderDuration(formatDuration(minutes, seconds));
    }
}

function renderDuration(durationText) {
    timerElement.replaceChildren(
        createTalkerLabel("Duration:"),
        document.createTextNode(durationText)
    );
}

function formatDuration(minutes, seconds) {
    return minutes + ":" + seconds.toString().padStart(2, "0");
}

function parseDateTime(dateTimeStr) {
    return new Date(dateTimeStr);
}
