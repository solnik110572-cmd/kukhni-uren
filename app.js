
'use strict';

const questions = [
  ['Какая форма кухни вам нужна?', ['Прямая', 'Угловая', 'П-образная', 'С островом', 'Пока не определились']],
  ['Укажите примерные размеры кухни', []],
  ['Какие фасады вам нравятся?', ['ЛДСП', 'МДФ в плёнке', 'Крашеный МДФ', 'Массив дерева', 'Нужна консультация']],
  ['Планируете встроенную технику?', ['Да', 'Нет', 'Частично', 'Пока не знаю']],
  ['На какой бюджет рассчитываете?', ['До 100 000 ₽', '100–150 тыс. ₽', '150–200 тыс. ₽', '200–300 тыс. ₽', 'Более 300 тыс. ₽', 'Нужна консультация']],
  ['Когда вам нужна кухня?', ['В течение месяца', 'Через 1–3 месяца', 'Позднее', 'Пока узнаю стоимость']],
  ['Где необходимо установить кухню?', []],
  ['Куда отправить расчёт?', []]
];

let step = 0;
const answers = Array(8).fill('');
const dimensions = ['', '', ''];
let unknown = false;
let phone = '';
let consent = false;
let contactMethod = '';

const $ = id => document.getElementById(id);

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

$('start').addEventListener('click', () => {
  $('quiz').hidden = false;
  step = 0;
  render();
  $('quiz').scrollIntoView({ behavior: 'smooth' });
});

$('back').addEventListener('click', () => {
  if (step > 0) {
    step--;
    render();
  } else {
    $('quiz').hidden = true;
    $('home').scrollIntoView();
  }
});

$('next').addEventListener('click', next);

function numWalls() {
  return answers[0] === 'Угловая' ? 2 : answers[0] === 'П-образная' ? 3 : 1;
}

function save() {
  if (step === 1) {
    unknown = $('unknown').checked;
    for (let i = 0; i < numWalls(); i++) {
      dimensions[i] = $('dim' + i).value.trim();
    }
  }

  if (step === 6) {
    answers[6] = $('city').value.trim();
  }

  if (step === 7) {
    answers[7] = $('person').value.trim();
    phone = $('phone').value.trim();
    contactMethod = $('contactMethod').value;
    consent = $('consent').checked;
  }
}

function valid() {
  if (step === 1) {
    return unknown || dimensions.slice(0, numWalls()).every(
      x => Number(x) > 0 && Number(x) < 100000
    );
  }

  if (step === 7) {
    return answers[7].length > 0 &&
      phone.replace(/\D/g, '').length >= 10 &&
      Boolean(contactMethod) &&
      consent;
  }

  return Boolean(answers[step].trim());
}

const fieldNames = {
  form: 'Форма кухни',
  dimensions: 'Размеры кухни',
  facades: 'Материал фасадов',
  appliances: 'Встроенная техника',
  budget: 'Бюджет',
  timing: 'Сроки',
  city: 'Населённый пункт',
  name: 'Ваше имя',
  phone: 'Телефон',
  contactMethod: 'Способ связи'
};

function renderSummary(payload) {
  return '<div class="summary">' +
    '<h3>Ваши ответы</h3>' +
    Object.entries(payload)
      .filter(([key]) => key !== 'consent')
      .map(([key, value]) =>
        '<div style="padding:10px 0;border-bottom:1px solid #e5e7eb;">' +
          
'<span style="color:#238447;font-weight:700;">' +
  escapeHtml(fieldNames[key] || key) +

':</span> ' +
'<span style="color:#222;">' + escapeHtml(value) + '</span>'

        '</div>'
      ).join('') +
    '</div>';
}

async function next() {
  save();

  if (!valid()) {
    $('error').textContent = 'Пожалуйста, заполните ответ перед продолжением.';
    return;
  }

  if (step < 7) {
    step++;
    render();
    return;
  }

  const payload = {
    form: answers[0],
    dimensions: unknown ? 'Неизвестны' : dimensions.slice(0, numWalls()).join(' × ') + ' мм',
    facades: answers[2],
    appliances: answers[3],
    budget: answers[4],
    timing: answers[5],
    city: answers[6],
    name: answers[7],
    phone,
    contactMethod,
    consent
  };

  $('next').disabled = true;
  $('error').textContent = '';

  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw Error(data.error || 'Не удалось отправить заявку');
    }

    $('answer').innerHTML =
      '<h3>Заявка отправлена!</h3><p>Мы получили ваши ответы.</p>';
    $('next').hidden = true;
    $('back').textContent = 'Назад';

  } catch (e) {
    $('answer').innerHTML =
      '<div class="demo">' +
        '<strong>Демонстрационный режим</strong>' +
        '<p>Заявка не отправлена в Telegram. Для настоящей отправки требуется настроить сервер и секретный токен бота.</p>' +
      '</div>' +
      renderSummary(payload);

    $('next').hidden = true;
    $('back').textContent = 'Изменить ответы';

  } finally {
    $('next').disabled = false;
  }
}

function render() {
  const [title, options] = questions[step];

  $('progressLabel').textContent = 'Шаг ' + (step + 1) + ' из 8';
  $('progressPercent').textContent = Math.round((step + 1) * 12.5) + '%';
  $('progressFill').style.width = ((step + 1) * 12.5) + '%';
  $('question').textContent = title;
  $('error').textContent = '';
  $('next').hidden = false;
  $('next').textContent = step === 7 ? 'Отправить заявку' : 'Далее →';
  $('back').textContent = 'Назад';

  let html = '';

  if (options.length) {
    html = options.map(opt =>
      '<label class="option ' + (answers[step] === opt ? 'selected' : '') + '">' +
        '<input type="radio" name="option" value="' + escapeHtml(opt) + '" ' +
        (answers[step] === opt ? 'checked' : '') + '>' +
        '<span>' + escapeHtml(opt) + '</span>' +
      '</label>'
    ).join('');

  } else if (step === 1) {
    html =
      '<p>Укажите длину стен, вдоль которых будет расположена кухня.</p>' +
      Array.from({ length: numWalls() }, (_, i) =>
        '<label class="field"><span>' +
          (numWalls() === 1 ? 'Длина кухни' : 'Стена ' + (i + 1)) +
          ' (мм)</span>' +
          '<input type="number" min="1" max="99999" id="dim' + i +
          '" value="' + escapeHtml(dimensions[i]) + '" ' +
          (unknown ? 'disabled' : '') +
          ' placeholder="Например, 3000"></label>'
      ).join('') +
      '<label><input type="checkbox" id="unknown" ' +
      (unknown ? 'checked' : '') +
      '> Пока не знаю размеры</label>';

  } else if (step === 6) {
    html =
      '<label class="field"><span>Город или населённый пункт</span>' +
      '<input id="city" maxlength="120" value="' +
      escapeHtml(answers[6]) +
      '" placeholder="Например, Урень"></label>';

  } else {
    html =
      '<p>Мы подготовим предварительный расчёт с учётом ваших пожеланий.</p>' +

      '<label class="field"><span>Как с вами связаться?</span>' +
      '<select id="contactMethod" required>' +
      '<option value="">Выберите способ связи</option>' +
      ['Telegram', 'MAX', 'ВКонтакте', 'Телефон'].map(method =>
        '<option value="' + method + '" ' +
        (contactMethod === method ? 'selected' : '') +
        '>' + method + '</option>'
      ).join('') +
      '</select></label>' +

      '<label class="field"><span>Ваше имя</span>' +
      '<input id="person" maxlength="100" value="' +
      escapeHtml(answers[7]) +
      '" placeholder="Имя"></label>' +

      '<label class="field"><span>Номер телефона</span>' +
      '<input id="phone" type="tel" maxlength="30" value="' +
      escapeHtml(phone) +
      '" placeholder="+7 (___) ___-__-__"></label>' +

      '<label><input id="consent" type="checkbox" ' +
      (consent ? 'checked' : '') +
      '> Согласен на обработку персональных данных для связи по заявке</label>' +

      '<p class="hint">До настройки Telegram заявки не отправляются. Для тестирования используйте вымышленные данные.</p>';
  }

  $('answer').innerHTML = html;

  if (options.length) {
    document.querySelectorAll('input[name=option]').forEach(el =>
      el.addEventListener('change', () => {
        answers[step] = el.value;
        render();
      })
    );
  }

  if (step === 1) {
    $('unknown').addEventListener('change', () => {
      save();
      unknown = $('unknown').checked;
      render();
    });
  }
}
