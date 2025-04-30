// ==UserScript==
// @name         Фикбук — красные строки
// @namespace    Violentmonkey Scripts
// @version      1.0
// @description  Чинит существующие и добавляет новые красные строки с отступами в тексте фанфика на Фикбуке
// @author       mellistea
// @license      MIT
// @match        https://ficbook.net/*
// @run-at       document-end
// @updateURL    https://github.com/mellistea/Ficbook-QoL/raw/refs/heads/main/Ficbook-QoL.user.js
// @downloadURL  https://github.com/mellistea/Ficbook-QoL/raw/refs/heads/main/Ficbook-QoL.user.js
// @copyright    2025, mellistea (https://openuserjs.org/users/mellistea)
// ==/UserScript==

(function () {
  'use strict';

  // Скрипт красных строк активен только на страницах чтения фанфиков
  if (!/^https:\/\/ficbook\.net\/readfic\//.test(location.href)) return;

  const content = document.getElementById('content'); // основной контейнер текста фанфика
  if (!content) return;

  const STORAGE_KEY = 'ficbook_red_line_enabled'; // ключ в localStorage для хранения состояния кнопки
  let redLineEnabled = false; // текущее состояние красной строки
  let backupHTML = ''; // резервная копия исходного HTML (для восстановления)

  // Создаём кнопку-переключатель
  const button = document.createElement('button');
  button.className = 'control-btn btn btn-default btn-sm';
  button.innerHTML = '⮞ Красные строки';
  button.style.whiteSpace = 'nowrap';
  button.style.padding = '2px 8px';
  button.style.fontSize = '12px';

  // Обработчик нажатия: переключить режим красной строки
  button.addEventListener('click', toggleRedLine);

  function toggleRedLine() {
    redLineEnabled = !redLineEnabled; // переключить флаг
    localStorage.setItem(STORAGE_KEY, redLineEnabled ? '1' : '0'); // сохранить состояние в localStorage
    console.log('Red Line toggled:', redLineEnabled);

    if (redLineEnabled) {
      enableRedLine(); // применить красную строку
    }
    else {
      disableRedLine(); // восстановить оригинал
    }
  }

  // Включение режима красной строки
  function enableRedLine() {
    if (!backupHTML) backupHTML = content.innerHTML; // сохранить оригинал, если ещё не сохраняли
    console.log('Applying red line effect');

    const rawHTML = content.innerHTML;
    const paragraphs = rawHTML.split(/(?:\n\s*\n)+/g); // разбить текст на абзацы по двойным переводам строк

    const baseAlign = window.getComputedStyle(content).textAlign || 'left'; // выравнивание оригинального текста
    const newContent = document.createElement('div'); // временный контейнер для нового HTML

    // Для каждого абзаца
    paragraphs.forEach((paraHTML, index) => {
      // Разбиваем каждый абзац на отдельные строки
      paraHTML.split(/\n+/g).forEach(lineHTML => {
        let trimmedHTML = lineHTML.trim(); // убираем пробелы с краёв
        if (trimmedHTML) {
          const spanBlock = document.createElement('span'); // создаём блочный span
          spanBlock.style.display = 'block'; // чтобы выглядел как div
          spanBlock.style.margin = '0';
          spanBlock.style.padding = '0';
          spanBlock.style.minHeight = '1em';
          spanBlock.style.textAlign = baseAlign;
          spanBlock.style.whiteSpace = 'normal'; // убираем эффект pre-line

          // Удаляем ведущие пробелы, &nbsp; и подобное — чтобы не было двойной красной строки
          spanBlock.innerHTML = trimmedHTML.replace(/^((\s|&nbsp;|\u00A0)+)/gi, '');

          // Если это не декоративный разделитель и не строка с ❧ — добавляем отступ
          if (!isSeparator(trimmedHTML) && !startsWithMarker(spanBlock)) {
            spanBlock.style.textIndent = '2em'; // собственно красная строка
          }

          newContent.appendChild(spanBlock);
        }
      });

      // Если это не последний абзац — вставляем пустую строку между абзацами
      if (index !== paragraphs.length - 1) {
        const spacer = document.createElement('span');
        spacer.style.display = 'block';
        spacer.style.height = '1.5em';
        spacer.innerHTML = '&nbsp;';
        newContent.appendChild(spacer);
      }
    });

    // Заменяем текст на обновлённый
    content.innerHTML = '';
    content.append(...newContent.childNodes);

    button.classList.add('btn-primary'); // визуально подсветить кнопку, что она включена

    // Убираем отступ у всех сносок внутри текста
    content.querySelectorAll('span.footnote').forEach(footnote => {
    footnote.style.textIndent = '0';
    });

  }

  // Выключение красной строки — восстанавливаем оригинал
  function disableRedLine() {
    if (!backupHTML) return;
    console.log('Restoring original content');
    content.innerHTML = backupHTML;
    button.classList.remove('btn-primary'); // убрать подсветку
  }

  // Определяет, является ли строка разделителем (───, •••, ✿ и т.д.)
  function isSeparator(text) {
    const cleaned = text.trim();
    if (cleaned.length > 25) return false; // длинные строки не считаем разделителями
    return /^[\s─━・•\*✿⊹~\-=<>★☆°●○◆◇□■▼▲※☆♥❤❀❃❁☀☁☂☃☄]+$/.test(cleaned);
  }

  // Определяет, начинается ли строка с ❧ — такие строки без отступа
  function startsWithMarker(element) {
    const text = element.textContent.trim();
    return text.startsWith('❧');
  }

  // Ждём появления панели настроек, чтобы вставить туда кнопку
  function waitForTextSettings() {
    const slideActive = document.querySelector('div.slide.active');
    const firstControl = slideActive?.querySelector('.text-settings-control');

    if (firstControl) {
      const wrapper = document.createElement('div');
      wrapper.className = 'text-settings-control';
      wrapper.appendChild(button);
      firstControl.parentNode.insertBefore(wrapper, firstControl);

      // Если флаг в localStorage включён — сразу подсветить кнопку
      if (redLineEnabled) {
        button.classList.add('btn-primary');
      }
    }
    else {
      // Ещё не загрузилось — повторим попытку через 0.5 сек
      setTimeout(waitForTextSettings, 500);
    }
  }

  // === Главное: если включено в localStorage — применяем сразу при загрузке
  if (localStorage.getItem(STORAGE_KEY) === '1') {
    redLineEnabled = true;
    enableRedLine(); // запускаем прямо при открытии страницы
  }

  // В любом случае запускаем установку кнопки (как только появится панель)
  waitForTextSettings();
})();
