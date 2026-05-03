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
 * # Created on 6/22/24, 11:01 AM
 * #
 * # Author: Silviu Stroe
 */
document.addEventListener('DOMContentLoaded', function () {
    let peakLevelRX = -30; // Initialize peak level for RX
    let peakLevelTX = -30; // Initialize peak level for TX
    let lastPeakRX = Date.now(); // Track last peak time for RX
    let lastPeakTX = Date.now(); // Track last peak time for TX
    let lastDecayRX = Date.now(); // Track last decay step for RX
    let lastDecayTX = Date.now(); // Track last decay step for TX

    const volumeLevelRX = document.getElementById('volumeLevelRX');
    const peakLevelBarRX = document.getElementById('peakLevelRX');
    const volumeLevelTX = document.getElementById('volumeLevelTX');
    const peakLevelBarTX = document.getElementById('peakLevelTX');
    const minDb = -30;
    const maxDb = 3;
    const peakHoldMs = 1000;
    const peakFallDbPerSecond = 13.3; // PPM-style fallback: roughly 20 dB in 1.5 s

    function updateLevels() {
        const now = Date.now();

        // Update peak level decay for RX
        if (now - lastPeakRX >= peakHoldMs) {
            const decayStartRX = Math.max(lastDecayRX, lastPeakRX + peakHoldMs);
            const elapsedSecondsRX = (now - decayStartRX) / 1000;
            peakLevelRX -= peakFallDbPerSecond * elapsedSecondsRX;
            peakLevelRX = Math.max(peakLevelRX, minDb);
            lastDecayRX = now;
        }
        updatePeakBar(peakLevelBarRX, peakLevelRX);

        // Update peak level decay for TX
        if (now - lastPeakTX >= peakHoldMs) {
            const decayStartTX = Math.max(lastDecayTX, lastPeakTX + peakHoldMs);
            const elapsedSecondsTX = (now - decayStartTX) / 1000;
            peakLevelTX -= peakFallDbPerSecond * elapsedSecondsTX;
            peakLevelTX = Math.max(peakLevelTX, minDb);
            lastDecayTX = now;
        }
        updatePeakBar(peakLevelBarTX, peakLevelTX);

        // Call this function again on the next animation frame
        requestAnimationFrame(updateLevels);
    }

    function getColorForLevel(dB) {
        if (dB <= -12) {
            return 'var(--vu-green)'; // Safe level range
        } else if (dB <= -6) {
            return 'var(--vu-yellow)'; // Target-to-caution range
        } else {
            return 'var(--vu-red)'; // Hot signal, approaching clipping
        }
    }

    function getPeakColorForLevel(dB) {
        if (dB <= -12) {
            return 'var(--vu-green-glow)';
        } else if (dB <= -6) {
            return 'var(--vu-yellow-glow)';
        } else {
            return 'var(--vu-red-glow)';
        }
    }

    function updatePeakBar(peakLevelBar, level) {
        let peakPercentage = ((level - minDb) / (maxDb - minDb)) * 100;
        peakPercentage = Math.max(0, Math.min(peakPercentage, 100));
        peakLevelBar.style.left = `${peakPercentage.toFixed(2)}%`;
        peakLevelBar.style.backgroundColor = getPeakColorForLevel(level);
        peakLevelBar.style.color = getPeakColorForLevel(level);
    }

    socket.on('audio_level_rx', function (data) {
        updateLevel(data, volumeLevelRX, peakLevelBarRX, 'RX');
    });

    socket.on('audio_level_tx', function (data) {
        updateLevel(data, volumeLevelTX, peakLevelBarTX, 'TX');
    });

    function updateLevel(data, volumeLevel, peakLevelBar, type) {
        const level = parseFloat(data.level);
        let percentage = ((level - minDb) / (maxDb - minDb)) * 100;
        percentage = Math.max(0, Math.min(percentage, 100));
        volumeLevel.style.width = `${percentage.toFixed(2)}%`;
        volumeLevel.style.backgroundColor = getColorForLevel(level);

        if (type === 'RX') {
            if (level > peakLevelRX) {
                peakLevelRX = level;
                lastPeakRX = Date.now();
                lastDecayRX = Date.now();
                updatePeakBar(peakLevelBar, peakLevelRX);
            }
        } else if (type === 'TX') {
            if (level > peakLevelTX) {
                peakLevelTX = level;
                lastPeakTX = Date.now();
                lastDecayTX = Date.now();
                updatePeakBar(peakLevelBar, peakLevelTX);
            }
        }
    }

    // Start the animation frame for peak level decay
    requestAnimationFrame(updateLevels);
});
