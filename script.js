/**
 * Today, Apparently — Main Application Script
 * Configured with Mumbai (19.0760° N, 72.8777° E) telemetry, live SunCalc
 * astronomy, live couch orbital odometer, and deterministic daily shuffling.
 */

(function () {
  'use strict';

  var MUMBAI_COORDS = {
    name: 'Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    timeZone: 'Asia/Kolkata'
  };

  var extraShuffleOffset = 0;

  /**
   * Seeded pseudo-random number generator (Mulberry32)
   * Returns a deterministic float in [0, 1) for a 32-bit integer seed.
   */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Deterministic Fisher-Yates shuffle using the provided PRNG function
   */
  function seededShuffle(array, rng) {
    var copy = array.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Check whether a given 4-digit year is a leap year
   */
  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Calculate day number of the year (1..366) and days remaining
   */
  function getDayOfYearInfo(date) {
    var year = date.getFullYear();
    var startOfToday = new Date(year, date.getMonth(), date.getDate());
    var startOfYear = new Date(year, 0, 1);
    var diffMs = startOfToday.getTime() - startOfYear.getTime();
    var dayOfYear = Math.round(diffMs / 86400000) + 1;
    var daysInYear = isLeapYear(year) ? 366 : 365;
    var daysRemaining = daysInYear - dayOfYear;
    var pctConsumed = ((dayOfYear / daysInYear) * 100).toFixed(1);
    return {
      dayOfYear: dayOfYear,
      daysInYear: daysInYear,
      daysRemaining: daysRemaining,
      pctConsumed: pctConsumed
    };
  }

  /**
   * Calculate lunar illumination percentage, waxing/waning state, moon emoji,
   * and days until the next full moon using SunCalc.
   */
  function getMoonInfo(date) {
    var hasSunCalc = typeof window.SunCalc !== 'undefined' && window.SunCalc.getMoonIllumination;
    var illum = hasSunCalc
      ? window.SunCalc.getMoonIllumination(date)
      : { fraction: 0.87, phase: 0.65 };

    var pct = Math.round(illum.fraction * 100);
    var phase = illum.phase;
    var isWaxing = phase <= 0.5;
    var stateLabel = isWaxing ? 'Waxing' : 'Waning';

    var emoji = '🌕';
    if (phase < 0.06 || phase > 0.94) {
      emoji = '🌑';
    } else if (phase < 0.22) {
      emoji = '🌒';
    } else if (phase < 0.28) {
      emoji = '🌓';
    } else if (phase < 0.44) {
      emoji = '🌔';
    } else if (phase <= 0.56) {
      emoji = '🌕';
    } else if (phase < 0.72) {
      emoji = '🌖';
    } else if (phase < 0.78) {
      emoji = '🌗';
    } else {
      emoji = '🌘';
    }

    var synodicMonth = 29.530588853;
    var daysUntilFull = 0;

    if (hasSunCalc) {
      var bestDiff = 999;
      var bestHours = 0;
      var startPhase = phase;
      var minHours = startPhase <= 0.5 ? 0 : Math.floor((1 - startPhase) * synodicMonth * 24);
      var maxHours = Math.ceil(31 * 24);

      for (var h = minHours; h <= maxHours; h += 4) {
        var probeDate = new Date(date.getTime() + h * 3600000);
        var probeIllum = window.SunCalc.getMoonIllumination(probeDate);
        var diff = Math.abs(probeIllum.phase - 0.5);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestHours = h;
        }
        if (probeIllum.phase >= 0.5 && h > minHours + 12 && diff > bestDiff) {
          break;
        }
      }
      daysUntilFull = Math.max(0, Math.round(bestHours / 24));
    } else {
      var phaseDelta = phase <= 0.5 ? (0.5 - phase) : (1.5 - phase);
      daysUntilFull = Math.round(phaseDelta * synodicMonth);
    }

    return {
      percentage: pct,
      stateLabel: stateLabel,
      emoji: emoji,
      daysUntilFull: daysUntilFull
    };
  }

  /**
   * Format a Date object into a readable time string (optionally in a specific timeZone)
   */
  function formatTime(d, timeZone) {
    if (!d || isNaN(d.getTime())) {
      return null;
    }
    try {
      var opts = {
        hour: 'numeric',
        minute: '2-digit'
      };
      if (timeZone) {
        opts.timeZone = timeZone;
      }
      return d.toLocaleTimeString('en-US', opts);
    } catch (e) {
      return d.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  }

  /**
   * Get solar details (sunrise, sunset, duration, and formatted fact sentence)
   */
  function getSolarDetails(date, lat, lng, placeName, timeZone) {
    var cityLabel = placeName || 'Mumbai';
    if (typeof window.SunCalc !== 'undefined' && window.SunCalc.getTimes) {
      var times = window.SunCalc.getTimes(date, lat, lng);
      var sunriseStr = formatTime(times.sunrise, timeZone);
      var sunsetStr = formatTime(times.sunset, timeZone);

      if (sunriseStr && sunsetStr) {
        var daylightMs = times.sunset.getTime() - times.sunrise.getTime();
        var totalMins = Math.max(0, Math.round(daylightMs / 60000));
        var hours = Math.floor(totalMins / 60);
        var mins = totalMins % 60;
        return {
          sunriseStr: sunriseStr,
          sunsetStr: sunsetStr,
          durationLabel: hours + 'h ' + mins + 'm',
          factText:
            'In ' +
            cityLabel +
            ' today, sunrise is at ' +
            sunriseStr +
            ' and sunset is at ' +
            sunsetStr +
            ', giving the city ' +
            hours +
            ' hours and ' +
            mins +
            ' minutes of daylight over the Arabian Sea. Traffic at Silk Board and the Western Express Highway will ignore both events.'
        };
      }
    }

    return {
      sunriseStr: '6:39 AM',
      sunsetStr: '6:02 PM',
      durationLabel: '11h 23m',
      factText:
        'In Mumbai today, the Sun rises over the eastern harbor and sets into the Arabian Sea on schedule. Traffic on the Western Express Highway will ignore both events.'
    };
  }

  /**
   * Calculate current Northern Hemisphere season and days until the next
   * solstice or equinox.
   */
  function getSeasonAndEquinoxInfo(date) {
    var year = date.getFullYear();
    var startOfToday = new Date(year, date.getMonth(), date.getDate());

    var events = [
      { name: 'spring equinox', seasonStarting: 'Spring', date: new Date(year, 2, 20) },
      { name: 'summer solstice', seasonStarting: 'Summer', date: new Date(year, 5, 21) },
      { name: 'autumn equinox', seasonStarting: 'Autumn', date: new Date(year, 8, 22) },
      { name: 'winter solstice', seasonStarting: 'Winter', date: new Date(year, 11, 21) },
      { name: 'spring equinox', seasonStarting: 'Spring', date: new Date(year + 1, 2, 20) }
    ];

    var currentSeason = 'Winter';
    if (startOfToday >= events[0].date && startOfToday < events[1].date) {
      currentSeason = 'Spring';
    } else if (startOfToday >= events[1].date && startOfToday < events[2].date) {
      currentSeason = 'Summer';
    } else if (startOfToday >= events[2].date && startOfToday < events[3].date) {
      currentSeason = 'Autumn';
    } else {
      currentSeason = 'Winter';
    }

    var nextEvent = events[4];
    for (var i = 0; i < events.length; i++) {
      if (events[i].date >= startOfToday) {
        nextEvent = events[i];
        break;
      }
    }

    var daysUntil = Math.round(
      (nextEvent.date.getTime() - startOfToday.getTime()) / 86400000
    );

    return {
      season: currentSeason,
      nextEventName: nextEvent.name,
      daysUntil: daysUntil
    };
  }

  /**
   * Format date as YYYY-MM-DD for share parameter
   */
  function formatISODate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  /**
   * Split a two-sentence fact so the final dry observation sentence is rendered
   * with subtle italic emphasis for deadpan comedic timing.
   */
  function renderFactSentences(pEl, fullText) {
    pEl.innerHTML = '';
    var trimmed = (fullText || '').trim();
    var lastPeriodBeforeEnd = trimmed.lastIndexOf('. ', trimmed.length - 3);

    if (lastPeriodBeforeEnd !== -1) {
      var setupSentence = trimmed.slice(0, lastPeriodBeforeEnd + 2);
      var punchlineSentence = trimmed.slice(lastPeriodBeforeEnd + 2);

      var setupSpan = document.createElement('span');
      setupSpan.textContent = setupSentence;

      var punchSpan = document.createElement('span');
      punchSpan.className = 'fact-punchline';
      punchSpan.textContent = punchlineSentence;

      pEl.appendChild(setupSpan);
      pEl.appendChild(punchSpan);
    } else {
      pEl.textContent = trimmed;
    }
  }

  /**
   * Set up IntersectionObserver so facts fade in gently as the reader scrolls
   */
  function initScrollObserver() {
    var blocks = document.querySelectorAll('.fact-block');

    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < blocks.length; i++) {
        blocks[i].classList.add('is-visible');
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -36px 0px',
        threshold: 0.1
      }
    );

    blocks.forEach(function (block, index) {
      if (index < 4) {
        block.style.transitionDelay = index * 70 + 'ms';
      }
      observer.observe(block);
    });
  }

  /**
   * Copy text to clipboard with fallback
   */
  function copyTextToClipboard(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(callback).catch(function () {
        fallbackCopy(text, callback);
      });
    } else {
      fallbackCopy(text, callback);
    }
  }

  /**
   * Fallback clipboard copy for file:// or older browsers
   */
  function fallbackCopy(text, callback) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      // Ignore copy error
    }
    document.body.removeChild(textarea);
    if (typeof callback === 'function') {
      callback();
    }
  }

  /**
   * Create a single DOM element for a fact block with index number and copy button
   */
  function createFactElement(fact, indexNumber, options) {
    var opts = options || {};
    var article = document.createElement('article');
    article.className = 'fact-block';

    var header = document.createElement('div');
    header.className = 'fact-header';

    var metaLeft = document.createElement('div');
    metaLeft.className = 'fact-meta-left';

    var indexSpan = document.createElement('span');
    indexSpan.className = 'fact-index';
    indexSpan.textContent = String(indexNumber).padStart(2, '0');

    var sepSpan = document.createElement('span');
    sepSpan.className = 'fact-sep';
    sepSpan.setAttribute('aria-hidden', 'true');
    sepSpan.textContent = '/';

    var categorySpan = document.createElement('span');
    categorySpan.className = 'fact-category';
    categorySpan.textContent = fact.category;

    metaLeft.appendChild(indexSpan);
    metaLeft.appendChild(sepSpan);
    metaLeft.appendChild(categorySpan);
    header.appendChild(metaLeft);

    var controlsRight = document.createElement('div');
    controlsRight.className = 'fact-controls';

    var p = document.createElement('p');
    p.className = 'fact-text';
    renderFactSentences(p, fact.text);

    if (opts.allowGeolocation && 'geolocation' in navigator) {
      var geoBtn = document.createElement('button');
      geoBtn.type = 'button';
      geoBtn.className = 'inline-util-btn';
      geoBtn.textContent = 'Use my GPS';
      geoBtn.setAttribute('aria-label', 'Switch sunrise and sunset from Mumbai to your exact coordinates');

      geoBtn.addEventListener('click', function () {
        geoBtn.textContent = 'Locating...';
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            var details = getSolarDetails(
              opts.date,
              pos.coords.latitude,
              pos.coords.longitude,
              'your exact coordinates',
              null
            );
            renderFactSentences(p, details.factText);
            geoBtn.textContent = 'GPS active';
            geoBtn.disabled = true;
          },
          function () {
            var details = getSolarDetails(
              opts.date,
              MUMBAI_COORDS.lat,
              MUMBAI_COORDS.lng,
              MUMBAI_COORDS.name,
              MUMBAI_COORDS.timeZone
            );
            renderFactSentences(p, details.factText);
            geoBtn.textContent = 'Mumbai IST';
            geoBtn.disabled = true;
          },
          { timeout: 8000, maximumAge: 600000 }
        );
      });

      controlsRight.appendChild(geoBtn);
    }

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'inline-util-btn copy-fact-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy this useless fact');
    copyBtn.addEventListener('click', function () {
      var currentText = p.textContent || fact.text;
      copyTextToClipboard('“' + currentText + '”', function () {
        copyBtn.textContent = 'Copied';
        setTimeout(function () {
          copyBtn.textContent = 'Copy';
        }, 1800);
      });
    });

    controlsRight.appendChild(copyBtn);
    header.appendChild(controlsRight);

    article.appendChild(header);
    article.appendChild(p);
    return article;
  }

  /**
   * Live ticking Couch Odometer: Earth moves around the Sun at ~107,200 km/h
   * (29.7778 km per second). Shows how far the reader has traveled since midnight.
   */
  function startCouchOdometer() {
    var orbitEl = document.getElementById('stat-orbit-val');
    if (!orbitEl) {
      return;
    }

    function updateOdometer() {
      var now = new Date();
      var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var secondsToday = (now.getTime() - startOfDay.getTime()) / 1000;
      var kmMoved = Math.round(secondsToday * 29.7778);
      orbitEl.textContent = kmMoved.toLocaleString('en-US') + ' km';
    }

    updateOdometer();
    setInterval(updateOdometer, 1000);
  }

  /**
   * Render the daily stream of facts (today-specific + deterministically shuffled)
   */
  function renderStream(now, dayInfo, moonInfo, solarDetails, seasonInfo, seedOffset) {
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();

    var dayRemainingLabel = dayInfo.daysRemaining === 1 ? 'day' : 'days';
    var todayCalendarFact = {
      category: 'TODAY · CALENDAR',
      text:
        'Today is day ' +
        dayInfo.dayOfYear +
        ' of ' +
        dayInfo.daysInYear +
        ', leaving ' +
        dayInfo.daysRemaining +
        ' ' +
        dayRemainingLabel +
        ' remaining before the calendar resets. You have had plenty of time to start whatever you were going to start.'
    };

    var fullMoonWaitText =
      moonInfo.daysUntilFull === 0
        ? 'the Moon reaches full illumination tonight'
        : 'there ' +
          (moonInfo.daysUntilFull === 1 ? 'is 1 day' : 'are ' + moonInfo.daysUntilFull + ' days') +
          ' until the next full moon';

    var todayMoonFact = {
      category: 'MOON · ORBIT',
      text:
        'The Moon is ' +
        moonInfo.percentage +
        '% illuminated and ' +
        moonInfo.stateLabel.toLowerCase() +
        ' today, and ' +
        fullMoonWaitText +
        '. It has been running this exact schedule for 4.5 billion years without asking for feedback.'
    };

    var todayMumbaiSolarFact = {
      category: 'MUMBAI · DAYLIGHT',
      text: solarDetails.factText
    };

    var eventCountdownText =
      seasonInfo.daysUntil === 0
        ? 'the ' + seasonInfo.nextEventName + ' arrives today'
        : 'there ' +
          (seasonInfo.daysUntil === 1 ? 'is 1 day' : 'are ' + seasonInfo.daysUntil + ' days') +
          ' until the ' +
          seasonInfo.nextEventName;

    var todaySeasonFact = {
      category: 'SPACE · SEASON',
      text:
        'It is currently ' +
        seasonInfo.season.toLowerCase() +
        ' in the Northern Hemisphere, and ' +
        eventCountdownText +
        '. In Mumbai, the forecast remains warm and humid regardless of what astronomy calls it.'
    };

    // Deterministic Daily Seed: seed = year * 10000 + month * 100 + day (+ optional manual deal offset)
    var baseSeed = year * 10000 + month * 100 + day;
    var activeSeed = baseSeed + (seedOffset || 0) * 7919;
    var rng = mulberry32(activeSeed);

    var mumbaiPool = Array.isArray(window.MUMBAI_FACTS_DATA) ? window.MUMBAI_FACTS_DATA : [];
    var starterPool = Array.isArray(window.FEATURED_STARTER_FACTS) ? window.FEATURED_STARTER_FACTS : [];
    var fullPool = Array.isArray(window.FACTS_DATA) ? window.FACTS_DATA : [];

    var dailyPicked = [];

    if (!seedOffset) {
      // Initial daily load: interleave Mumbai funny facts and the signature classic starter facts
      var shuffledMumbai = seededShuffle(mumbaiPool, rng);
      var shuffledStarters = seededShuffle(starterPool, rng);

      dailyPicked = [
        shuffledMumbai[0],
        shuffledStarters[0],
        shuffledMumbai[1],
        shuffledStarters[1],
        shuffledMumbai[2],
        shuffledStarters[2],
        shuffledMumbai[3],
        shuffledStarters[3],
        shuffledMumbai[4],
        shuffledStarters[4],
        shuffledStarters[5]
      ].filter(Boolean);
    } else {
      // When user clicks "Deal another 15", shuffle across the entire 225+ facts repository
      var shuffledAll = seededShuffle(fullPool, rng);
      dailyPicked = shuffledAll.slice(0, 11);
    }

    var streamEl = document.getElementById('facts-stream');
    if (streamEl) {
      streamEl.innerHTML = '';

      var idx = 1;
      streamEl.appendChild(createFactElement(todayCalendarFact, idx++));
      streamEl.appendChild(createFactElement(todayMoonFact, idx++));
      streamEl.appendChild(
        createFactElement(todayMumbaiSolarFact, idx++, {
          allowGeolocation: true,
          date: now
        })
      );
      streamEl.appendChild(createFactElement(todaySeasonFact, idx++));

      for (var i = 0; i < dailyPicked.length; i++) {
        streamEl.appendChild(createFactElement(dailyPicked[i], idx++));
      }
    }

    initScrollObserver();
  }

  /**
   * Main initialization
   */
  function init() {
    var now = new Date();

    // 1. Render top date heading ("November 2")
    var dateHeadingEl = document.getElementById('date-heading');
    if (dateHeadingEl) {
      dateHeadingEl.textContent = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      });
    }

    // 2. Compute Day of Year, Lunar State, and Mumbai Solar Times
    var dayInfo = getDayOfYearInfo(now);
    var moonInfo = getMoonInfo(now);
    var solarDetails = getSolarDetails(
      now,
      MUMBAI_COORDS.lat,
      MUMBAI_COORDS.lng,
      MUMBAI_COORDS.name,
      MUMBAI_COORDS.timeZone
    );
    var seasonInfo = getSeasonAndEquinoxInfo(now);

    var dateMetaEl = document.getElementById('date-meta');
    if (dateMetaEl) {
      dateMetaEl.textContent =
        'Day ' +
        dayInfo.dayOfYear +
        ' of ' +
        dayInfo.daysInYear +
        ' \u00B7 ' +
        moonInfo.emoji +
        ' ' +
        moonInfo.percentage +
        '% full \u00B7 ' +
        moonInfo.stateLabel +
        ' \u00B7 Mumbai (19.08\u00B0N, 72.88\u00B0E)';
    }

    // 3. Populate 4-Cell Useless Telemetry Grid
    var statYearVal = document.getElementById('stat-year-val');
    var statYearSub = document.getElementById('stat-year-sub');
    if (statYearVal) {
      statYearVal.textContent = dayInfo.pctConsumed + '%';
    }
    if (statYearSub) {
      statYearSub.textContent = dayInfo.daysRemaining + ' days left to panic';
    }

    var statMoonVal = document.getElementById('stat-moon-val');
    var statMoonSub = document.getElementById('stat-moon-sub');
    if (statMoonVal) {
      statMoonVal.textContent = moonInfo.emoji + ' ' + moonInfo.percentage + '%';
    }
    if (statMoonSub) {
      statMoonSub.textContent =
        moonInfo.stateLabel +
        ' \u00B7 Full in ' +
        moonInfo.daysUntilFull +
        'd';
    }

    var statSunVal = document.getElementById('stat-sun-val');
    var statSunSub = document.getElementById('stat-sun-sub');
    if (statSunVal) {
      statSunVal.textContent = solarDetails.durationLabel;
    }
    if (statSunSub) {
      statSunSub.textContent = solarDetails.sunriseStr + ' \u2013 ' + solarDetails.sunsetStr;
    }

    startCouchOdometer();

    // 4. Render initial daily stream
    renderStream(now, dayInfo, moonInfo, solarDetails, seasonInfo, 0);

    // 5. Wire up "Deal another 15" / "Give me more useless facts" buttons
    function handleReshuffle() {
      extraShuffleOffset += 1;
      renderStream(now, dayInfo, moonInfo, solarDetails, seasonInfo, extraShuffleOffset);
    }

    var shuffleTopBtn = document.getElementById('shuffle-top-button');
    if (shuffleTopBtn) {
      shuffleTopBtn.addEventListener('click', function () {
        handleReshuffle();
        shuffleTopBtn.textContent = 'Dealt batch #' + (extraShuffleOffset + 1);
      });
    }

    var shuffleBottomBtn = document.getElementById('shuffle-bottom-button');
    if (shuffleBottomBtn) {
      shuffleBottomBtn.addEventListener('click', function () {
        handleReshuffle();
        var streamTop = document.getElementById('facts-stream');
        if (streamTop && streamTop.scrollIntoView) {
          streamTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // 6. Wire up "Share today" button
    var shareBtn = document.getElementById('share-button');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var isoDate = formatISODate(now);
        var shareUrl = window.location.href.split('?')[0].split('#')[0] + '?date=' + isoDate;

        copyTextToClipboard(shareUrl, function () {
          var originalText = 'Share today';
          shareBtn.textContent = 'Copied link \u00B7 ' + isoDate;
          setTimeout(function () {
            shareBtn.textContent = originalText;
          }, 2400);
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
