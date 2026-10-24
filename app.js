(function () {
  var DONE_KEY = "study-abroad-trips-done";
  var CATEGORIES = ["Place", "Do", "Food", "Tip", "Note"];
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  var listEl = document.getElementById("list");
  var updatedEl = document.getElementById("updated");
  var statusEl = document.getElementById("status");
  var trips = null;
  var loadToken = 0;
  var memoryDone = null;

  function clean(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function readDone() {
    if (memoryDone) return memoryDone;
    memoryDone = {};
    try {
      var raw = localStorage.getItem(DONE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        memoryDone = parsed;
      }
    } catch (err) {
      memoryDone = {};
    }
    return memoryDone;
  }

  function writeDone(map) {
    memoryDone = map;
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(map));
    } catch (err) {
      /* The checklist still works for this visit if storage is blocked. */
    }
  }

  function fileSaysDone(item) {
    return item.done === true || item.done === "Yes";
  }

  function isDone(item, map) {
    if (Object.prototype.hasOwnProperty.call(map, item.id)) return Boolean(map[item.id]);
    return fileSaysDone(item);
  }

  function formatUpdated(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(value));
    if (!match) return "";
    var month = MONTHS[Number(match[2]) - 1];
    if (!month) return "";
    return "Updated " + month + " " + Number(match[3]) + ", " + match[1];
  }

  function categoryRank(category) {
    var index = CATEGORIES.indexOf(category);
    return index === -1 ? CATEGORIES.length : index;
  }

  function itemId(place, item, index) {
    if (item.id) return String(item.id);
    return [place.place || "place", item.category || "item", item.title || "untitled", index]
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function safeUrl(value) {
    var raw = clean(value);
    if (!raw) return "";
    try {
      var url = new URL(raw, window.location.href);
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch (err) {
      return "";
    }
    return "";
  }

  function localImage(value) {
    var raw = clean(value);
    if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.indexOf("//") === 0 || raw.indexOf("..") !== -1) {
      return "";
    }
    return raw;
  }

  function renderCredit(credit) {
    var text = clean(credit);
    if (!text) return null;
    var match = text.match(/https?:\/\/\S+/);
    var href = match ? safeUrl(match[0].replace(/[),.;]+$/, "")) : "";
    var label = match ? clean(text.replace(match[0], "").replace(/[—–-]\s*$/, "")) : text;
    var caption = el("figcaption", "photo-credit");
    if (href) {
      var link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label || "Photo credit";
      caption.appendChild(link);
    } else {
      caption.textContent = label;
    }
    return caption;
  }

  function sourceHost(href) {
    try {
      return new URL(href).hostname.replace(/^www\./, "");
    } catch (err) {
      return "";
    }
  }

  function placeMeta(place) {
    return [clean(place.area), clean(place.region)].filter(Boolean).join(" · ");
  }

  function groupItems(items) {
    var tagged = items.map(function (item, index) {
      return { item: item, index: index };
    });
    tagged.sort(function (a, b) {
      return categoryRank(a.item.category) - categoryRank(b.item.category) || a.index - b.index;
    });
    var groups = [];
    tagged.forEach(function (entry) {
      var category = clean(entry.item.category) || "Note";
      var last = groups[groups.length - 1];
      if (!last || last.category !== category) {
        last = { category: category, items: [] };
        groups.push(last);
      }
      last.items.push(entry.item);
    });
    return groups;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function refreshProgress(placeEl) {
    var boxes = placeEl.querySelectorAll('input[type="checkbox"]');
    var done = 0;
    boxes.forEach(function (box) {
      if (box.checked) done += 1;
    });
    var node = placeEl.querySelector(".progress");
    if (!node) return;
    if (!boxes.length) {
      node.textContent = "";
      return;
    }
    node.textContent = done + " of " + boxes.length + " done";
  }

  function sourceLink(href, className) {
    var link = el("a", className || "source");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.appendChild(document.createTextNode("Source"));
    var host = sourceHost(href);
    if (host) link.appendChild(el("span", "host", host));
    return link;
  }

  function renderItem(item) {
    var li = el("li", "item" + (item.checked ? " is-done" : ""));
    var label = el("label", "row");
    var input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.id = item.id;
    input.checked = item.checked;
    var copy = el("span", "copy");
    copy.appendChild(el("span", "title", item.title || "Untitled"));
    if (item.details) copy.appendChild(el("span", "details", item.details));
    label.appendChild(input);
    label.appendChild(copy);
    li.appendChild(label);
    if (item.href) li.appendChild(sourceLink(item.href));
    return li;
  }

  function renderPlace(place, index) {
    var section = el("section", "place");
    section.dataset.place = String(index);
    var name = clean(place.place) || "Untitled place";
    var imageSrc = localImage(place.image);
    if (imageSrc) {
      var figure = el("figure", "photo");
      var img = document.createElement("img");
      img.src = imageSrc;
      img.alt = "Photograph of " + name;
      img.className = "photo-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "");
      figure.appendChild(img);
      var credit = renderCredit(place.credit);
      if (credit) figure.appendChild(credit);
      section.appendChild(figure);
    }
    var head = el("div", "place-head");
    var titles = el("div", "place-titles");
    var heading = el("h2", "place-name", name);
    heading.id = "place-" + index;
    section.setAttribute("aria-labelledby", heading.id);
    titles.appendChild(heading);
    titles.appendChild(el("p", "progress", ""));
    head.appendChild(titles);
    var meta = placeMeta(place);
    if (meta) head.appendChild(el("p", "region", meta));
    section.appendChild(head);
    var blurb = clean(place.blurb);
    if (blurb) section.appendChild(el("p", "blurb", blurb));
    var placeHref = safeUrl(place.source);
    if (placeHref) section.appendChild(sourceLink(placeHref, "source place-source"));

    var split = el("div", "split");
    split.setAttribute("aria-hidden", "true");
    split.appendChild(el("span", "notch left"));
    split.appendChild(el("span", "notch right"));
    section.appendChild(split);

    var items = Array.isArray(place.items) ? place.items : [];
    var doneMap = readDone();
    var prepared = [];
    items.forEach(function (item, itemIndex) {
      if (!item || typeof item !== "object") return;
      var id = itemId(place, item, itemIndex);
      prepared.push({
        id: id,
        category: clean(item.category) || "Note",
        title: clean(item.title),
        details: clean(item.details),
        href: safeUrl(item.source),
        checked: isDone({ id: id, done: item.done }, doneMap)
      });
    });

    if (!prepared.length) {
      if (!blurb) section.appendChild(el("p", "notice", "Nothing listed yet."));
    } else {
      groupItems(prepared).forEach(function (group) {
        var block = el("section", "group");
        var category = el("h3", "category", group.category);
        var catId = "place-" + index + "-" + group.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        category.id = catId;
        block.setAttribute("aria-labelledby", catId);
        block.appendChild(category);
        var ul = el("ul", "items");
        group.items.forEach(function (item) {
          ul.appendChild(renderItem(item));
        });
        block.appendChild(ul);
        section.appendChild(block);
      });
    }

    refreshProgress(section);
    return section;
  }

  function showError() {
    listEl.replaceChildren(el(
      "p",
      "notice",
      "The list could not be opened. Connect to wifi once and reload. After that, the last list stays on this phone."
    ));
  }

  function render() {
    var places = trips && Array.isArray(trips.places) ? trips.places : [];
    updatedEl.textContent = formatUpdated(trips && trips.updated) || "Trip checklist";
    setStatus();
    if (!places.length) {
      listEl.replaceChildren(el("p", "notice", "No places in the list yet."));
      return;
    }
    var fragment = document.createDocumentFragment();
    places.forEach(function (place, index) {
      fragment.appendChild(renderPlace(place || {}, index));
    });
    listEl.replaceChildren(fragment);
  }

  function setStatus() {
    statusEl.textContent = navigator.onLine
      ? ""
      : "Offline. Showing the last list saved on this phone.";
  }

  function load() {
    var token = ++loadToken;
    return fetch("./data/trips.json")
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then(function (data) {
        if (token !== loadToken) return;
        trips = data;
        render();
      })
      .catch(function () {
        if (token !== loadToken) return;
        setStatus();
        if (!trips) showError();
      });
  }

  listEl.addEventListener("change", function (event) {
    var input = event.target;
    if (!input || input.type !== "checkbox" || !input.dataset.id) return;
    var map = readDone();
    map[input.dataset.id] = input.checked;
    writeDone(map);
    var item = input.closest(".item");
    if (item) item.classList.toggle("is-done", input.checked);
    var place = input.closest(".place");
    if (place) refreshProgress(place);
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(function () {});
  }

  window.addEventListener("offline", setStatus);
  window.addEventListener("online", function () {
    setStatus();
    load();
  });

  load();
})();
