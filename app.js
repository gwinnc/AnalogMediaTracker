const form = document.querySelector("#album-form");
const tableBody = document.querySelector("#collection-table-body");
const trackList = document.querySelector("#track-list");
const addTrackButton = document.querySelector("#add-track-button");
const saveButton = document.querySelector("#save-album-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const formHeading = document.querySelector("#add-record-heading");
const collectionSearch = document.querySelector("#collection-search");
const collectionSort = document.querySelector("#collection-sort");
const replacementFilter = document.querySelector("#replacement-filter");
const genreFilter = document.querySelector("#genre-filter");
const ownerFilter = document.querySelector("#owner-filter");
const collectionSummary = document.querySelector("#collection-summary");
const shoppingViewToggle = document.querySelector("#shopping-view-toggle");
const artistLetterNav = document.querySelector("#artist-letter-nav");
const addRecordPanel = document.querySelector("#add-record-panel");


let editingAlbumId = null;

function createTrackRow(track = {}) {
  const previousRows = [...trackList.querySelectorAll(".track-row")];

  const previousSideInput = previousRows.length
    ? previousRows[previousRows.length - 1].querySelector('[name="side"]')
    : null;

  const defaultSide = previousSideInput
    ? previousSideInput.value.trim().toUpperCase() || "A"
    : "A";

  function getNextTrackNumber(side, rowsToCheck) {
    const numbers = rowsToCheck
      .filter((existingRow) => {
        const existingSide = existingRow
          .querySelector('[name="side"]')
          .value.trim()
          .toUpperCase();

        return existingSide === side;
      })
      .map((existingRow) =>
        Number(existingRow.querySelector('[name="trackNumber"]').value)
      )
      .filter((number) => Number.isInteger(number) && number > 0);

    return numbers.length ? Math.max(...numbers) + 1 : 1;
  }

  const initialSide = (track.side || defaultSide).trim().toUpperCase();
  const nextNumber = getNextTrackNumber(initialSide, previousRows);
  const initialTrackNumber =
    track.trackNumber !== undefined && track.trackNumber !== ""
      ? track.trackNumber
      : String(nextNumber);

  const row = document.createElement("fieldset");
  row.className = "track-row";

  const legend = document.createElement("legend");
  legend.textContent = "Track";
  row.appendChild(legend);

  row.append(
    createField("Side", "side", "text", initialSide),
    createField(
      "Track number",
      "trackNumber",
      "number",
      initialTrackNumber,
      "1"
    ),
    createField("Song title", "title", "text", track.title || ""),
    createField(
      "Issue or scratch notes",
      "issue",
      "text",
      track.issue || "None"
    )

  );

  const sideInput = row.querySelector('[name="side"]');
  const trackNumberInput = row.querySelector('[name="trackNumber"]');

  sideInput.addEventListener("change", () => {
    const newSide = sideInput.value.trim().toUpperCase();
    sideInput.value = newSide;

    const otherRows = [...trackList.querySelectorAll(".track-row")]
      .filter((existingRow) => existingRow !== row);

    trackNumberInput.value = getNextTrackNumber(newSide, otherRows);
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove Track";
  removeButton.addEventListener("click", () => row.remove());

  row.appendChild(removeButton);
  return row;
}


function createField(labelText, name, type, value = "", placeholder = "") {
  const label = document.createElement("label");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;

  label.appendChild(input);
  return label;
}

function addCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text || "—";
  row.appendChild(cell);
}

function toTitleCase(text) {
  return text
    .toLocaleLowerCase()
    .replace(/(^|[\s-])([\p{L}\p{N}])/gu, (_, boundary, character) =>
      boundary + character.toLocaleUpperCase()
    );
}

function getTrackData() {
  return [...trackList.querySelectorAll(".track-row")]
    .map((row) => {
      const value = (name) =>
        row.querySelector(`[name="${name}"]`).value.trim();

      return {
        side: value("side").toUpperCase(),
        trackNumber: value("trackNumber"),
        title: toTitleCase(value("title")),
        issue: value("issue")
      };
    })
    .filter((track) => track.title || track.issue)
    .sort((first, second) => {
      const sideOrder = first.side.localeCompare(second.side, undefined, {
        sensitivity: "base",
        numeric: true
      });

      if (sideOrder !== 0) return sideOrder;

      return first.trackNumber.localeCompare(second.trackNumber, undefined, {
        numeric: true
      });
    });

}


function summarizeIssues(tracks = []) {
  return tracks
        .filter(
      (track) =>
        track.issue &&
        track.issue.trim().toLowerCase() !== "none"
    )
    .map((track) => {
      const location = [
        track.side ? `Side ${track.side}` : "",
        track.trackNumber ? `Track ${track.trackNumber}` : "",
        track.title
      ]
        .filter(Boolean)
        .join(", ");

      return `${location}: ${track.issue}`;
    })
    .join("; ");
}

function updateGenreFilter(albums) {
  const selectedGenre = genreFilter.value;

  const genres = [
    ...new Map(
      albums
        .map((album) => (album.genre || "").trim())
        .filter(Boolean)
        .map((genre) => [genre.toLocaleLowerCase(), genre])
    ).values()
  ].sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: "base" })
  );

  genreFilter.replaceChildren(new Option("All genres", ""));

  for (const genre of genres) {
    genreFilter.add(new Option(genre, genre));
  }

  // Preserve the selection if that genre is still in the collection.
  genreFilter.value =
    genres.find(
      (genre) =>
        genre.toLocaleLowerCase() === selectedGenre.toLocaleLowerCase()
    ) || "";
}

function updateOwnerFilter(albums) {
  const selectedOwner = ownerFilter.value;

  const owners = [
    ...new Map(
      albums
        .map((album) => (album.owner || "").trim())
        .filter(Boolean)
        .map((owner) => [owner.toLocaleLowerCase(), owner])
    ).values()
  ].sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: "base" })
  );

  ownerFilter.replaceChildren(new Option("All owners", ""));

  for (const owner of owners) {
    ownerFilter.add(new Option(owner, owner));
  }

  ownerFilter.value =
    owners.find(
      (owner) =>
        owner.toLocaleLowerCase() === selectedOwner.toLocaleLowerCase()
    ) || "";
}


function albumMatchesFilters(album, searchTerm, selectedGenre, selectedOwner) {
  const searchableText = [
    album.artist,
    album.album,
    album.genre,
    album.owner,
    album.storageLocation,
    ...(album.tracks || []).flatMap((track) => [track.title, track.issue])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchesSearch = searchableText.includes(searchTerm);
  const matchesReplacement =
    replacementFilter.value === "all" || album.needsReplacement === true;
  const matchesGenre =
    !selectedGenre ||
    (album.genre || "").trim().toLocaleLowerCase() === selectedGenre;
  const matchesOwner =
    !selectedOwner ||
    (album.owner || "").trim().toLocaleLowerCase() === selectedOwner;

  return matchesSearch && matchesReplacement && matchesGenre && matchesOwner;
}

function getArtistSortName(artist) {
  return (artist || "").trim().replace(/^the\s+/i, "");
}

function compareAlbums(first, second, sortMode) {
      if (sortMode === "updated-desc") {
      const firstUpdated = Date.parse(first.updatedAt);
      const secondUpdated = Date.parse(second.updatedAt);

      // Keep albums without a valid update timestamp at the end.
      if (!Number.isFinite(firstUpdated) && Number.isFinite(secondUpdated)) return 1;
      if (Number.isFinite(firstUpdated) && !Number.isFinite(secondUpdated)) return -1;

      return (Number.isFinite(secondUpdated) ? secondUpdated : 0) -
        (Number.isFinite(firstUpdated) ? firstUpdated : 0);
    }
    
    if (sortMode === "created-desc") {
      const firstCreated = Date.parse(first.createdAt);
      const secondCreated = Date.parse(second.createdAt);

      // Keep albums without a valid creation timestamp at the end.
      if (!Number.isFinite(firstCreated) && Number.isFinite(secondCreated)) return 1;
      if (Number.isFinite(firstCreated) && !Number.isFinite(secondCreated)) return -1;

      return (Number.isFinite(secondCreated) ? secondCreated : 0) -
        (Number.isFinite(firstCreated) ? firstCreated : 0);
    }

    if (sortMode === "album-asc") {
      return (first.album || "").localeCompare(second.album || "", undefined, {
        sensitivity: "base",
        numeric: true
      });
    } 

    if (sortMode === "genre-asc") {
      const firstGenre = (first.genre || "").trim();
      const secondGenre = (second.genre || "").trim();

      // Keep albums with no genre at the end.
      if (!firstGenre && secondGenre) return 1;
      if (firstGenre && !secondGenre) return -1;

      return firstGenre.localeCompare(secondGenre, undefined, {
        sensitivity: "base",
        numeric: true
      });
    }

    if (sortMode === "year-desc" || sortMode === "year-asc") {
      const firstYear = Number(first.pressingYear) || 0;
      const secondYear = Number(second.pressingYear) || 0;

      // Keep albums with no pressing year at the end.
      if (!firstYear && secondYear) return 1;
      if (firstYear && !secondYear) return -1;

      return sortMode === "year-desc"
        ? secondYear - firstYear
        : firstYear - secondYear;
    }

    return getArtistSortName(first.artist).localeCompare(
    getArtistSortName(second.artist),
    undefined,
    {
      sensitivity: "base",
      numeric: true
    }
  );

}
function getArtistInitial(artist) {
  const name = (artist || "").trim().replace(/^the\s+/i, "");
  const initial = name.charAt(0).toLocaleUpperCase();
  return /^[A-Z]$/.test(initial) ? initial : "#";
}


function updateArtistLetterNav(albums, sortMode) {
  artistLetterNav.replaceChildren();

  if (sortMode !== "artist-asc" || albums.length === 0) {
    artistLetterNav.hidden = true;
    return;
  }

  const letters = [...new Set(
    albums.map((album) => getArtistInitial(album.artist))
  )];

  for (const letter of letters) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = letter;
    button.setAttribute(
      "aria-label",
      letter === "#"
        ? "Jump to artists starting with a number or symbol"
        : `Jump to artists starting with ${letter}`
    );

    button.addEventListener("click", () => {
      const targetRow = tableBody.querySelector(
        `tr[data-artist-initial="${letter}"]`
      );
      targetRow?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    artistLetterNav.appendChild(button);
  }

  artistLetterNav.hidden = false;
}

async function renderAlbums() {
  const albums = await getAlbums();
  const searchTerm = collectionSearch.value.trim().toLowerCase();

  updateGenreFilter(albums);
  updateOwnerFilter(albums);

  const selectedGenre = genreFilter.value.toLocaleLowerCase();
  const selectedOwner = ownerFilter.value.toLocaleLowerCase();
  const matchingAlbums = albums.filter((album) =>
    albumMatchesFilters(album, searchTerm, selectedGenre, selectedOwner)
  );


  const totalTracks = albums.reduce(
    (count, album) => count + (album.tracks || []).length,
    0
  );

  const totalSpent = albums.reduce((total, album) => {
    const price = Number(album.purchasePrice);
    return Number.isFinite(price) && price >= 0 ? total + price : total;
  }, 0);

  const formattedTotal = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD"
  }).format(totalSpent);

  collectionSummary.textContent =
    `Showing ${matchingAlbums.length} of ${albums.length} albums · ` +
    `${totalTracks} tracks total · Total recorded cost: ${formattedTotal}`;
    const uniqueArtistCount = new Set(
    albums
      .map((album) => (album.artist || "").trim().toLocaleLowerCase())
      .filter(Boolean)
  ).size;

  const uniqueGenreCount = new Set(
    albums
      .map((album) => (album.genre || "").trim().toLocaleLowerCase())
      .filter(Boolean)
  ).size;

  const replacementCount = albums.filter(
    (album) => album.needsReplacement === true
  ).length;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const recentlyAddedCount = albums.filter((album) => {
    const createdAt = Date.parse(album.createdAt);
    return Number.isFinite(createdAt) && createdAt >= thirtyDaysAgo;
  }).length;

    const recentlyEditedCount = albums.filter((album) => {
    const createdAt = Date.parse(album.createdAt);
    const updatedAt = Date.parse(album.updatedAt);

    return (
      Number.isFinite(createdAt) &&
      Number.isFinite(updatedAt) &&
      updatedAt > createdAt &&
      updatedAt >= thirtyDaysAgo
    );
  }).length;


  document.querySelector("#collection-stats").textContent =
    `${uniqueArtistCount} artists · ${uniqueGenreCount} genres entered · ` +
    `${replacementCount} records need replacement · ` +
    `${recentlyAddedCount} added in the last 30 days · ` +
    `${recentlyEditedCount} edited in the last 30 days`;



  const sortMode = collectionSort.value;

  matchingAlbums.sort((first, second) =>
    compareAlbums(first, second, sortMode)
  );
  updateArtistLetterNav(matchingAlbums, sortMode);
  tableBody.replaceChildren();

  if (matchingAlbums.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 14;
    cell.textContent = searchTerm
      ? "No records match your search."
      : "Your collection is empty.";

    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  for (const album of matchingAlbums) {
    const row = document.createElement("tr");
    row.dataset.artistInitial = getArtistInitial(album.artist);
    addCell(row, album.artist);
    const albumCell = document.createElement("td");
    const albumContent = document.createElement("div");
    albumContent.className = "album-cell-content";

    const albumImages = album.images ?? [];
const coverData = albumImages[0]?.data;

if (coverData) {
  const coverButton = document.createElement("button");
  coverButton.type = "button";
  coverButton.setAttribute("aria-label", `View cover art for ${album.album || "album"}`);
  coverButton.style.padding = "0";
  coverButton.style.border = "0";
  coverButton.style.background = "transparent";
  coverButton.style.cursor = "pointer";

  const coverImage = document.createElement("img");
  coverImage.src = coverData;
  coverImage.alt = `Cover art for ${album.album || "album"}`;
  coverImage.width = 56;
  coverImage.height = 56;
  coverImage.loading = "lazy";
  coverImage.style.objectFit = "cover";

  coverButton.appendChild(coverImage);

  coverButton.addEventListener("click", () => {
    let currentIndex = 0;

    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", "Album art viewer");
    dialog.style.padding = "1rem";
    dialog.style.maxWidth = "90vw";
    dialog.style.maxHeight = "90vh";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "0.5rem";
    controls.style.alignItems = "center";

    const previousButton = document.createElement("button");
    previousButton.type = "button";
    previousButton.textContent = "Previous";

    const imageCount = document.createElement("span");

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "Next";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";

    const largeImage = document.createElement("img");
    largeImage.style.display = "block";
    largeImage.style.maxWidth = "85vw";
    largeImage.style.maxHeight = "80vh";
    largeImage.style.objectFit = "contain";
    largeImage.style.marginTop = "0.75rem";

    function showCurrentImage() {
      const image = albumImages[currentIndex];
      largeImage.src = image.data;
      largeImage.alt = image.name;
      imageCount.textContent = `${currentIndex + 1} of ${albumImages.length}`;
      previousButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === albumImages.length - 1;
    }

    previousButton.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        showCurrentImage();
      }
    });

    nextButton.addEventListener("click", () => {
      if (currentIndex < albumImages.length - 1) {
        currentIndex += 1;
        showCurrentImage();
      }
    });

    closeButton.addEventListener("click", () => dialog.close());

    controls.append(previousButton, imageCount, nextButton, closeButton);
    dialog.append(controls, largeImage);
    document.body.appendChild(dialog);

    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    showCurrentImage();
    dialog.showModal();
  });

  albumContent.appendChild(coverButton);
}


    const albumTitle = document.createElement("span");
    albumTitle.textContent = album.album || "—";
    albumContent.appendChild(albumTitle);

    albumCell.appendChild(albumContent);
    row.appendChild(albumCell);

    addCell(row, album.needsReplacement ? "Needs replacement" : "No");
    const tracks = album.tracks || [];
    const trackCell = document.createElement("td");
    const issueCount = tracks.filter(
    (track) => track.issue && track.issue.trim().toLowerCase() !== "none"
    ).length;

    trackCell.textContent =
      issueCount === 0
        ? "No issues"
        : `${issueCount} track${issueCount === 1 ? "" : "s"} with issues`;


    if (tracks.length > 0) {
      const trackDetails = document.createElement("details");
      const trackSummary = document.createElement("summary");
      trackSummary.textContent = `Show tracks (${tracks.length})`;

      const trackItems = document.createElement("ul");

      for (const track of tracks) {
        const item = document.createElement("li");
        const location = [
          track.side ? `Side ${track.side}` : "",
          track.trackNumber ? `Track ${track.trackNumber}` : "",
          track.title || ""
        ]
          .filter(Boolean)
          .join(", ");

        const hasIssue =
          track.issue && track.issue.trim().toLowerCase() !== "none";

        item.textContent = hasIssue
          ? `${location} — Issue: ${track.issue}`
          : location || "Track details not recorded";

        trackItems.appendChild(item);
      }

      trackDetails.append(trackSummary, trackItems);
      trackCell.appendChild(trackDetails);
    }

    row.appendChild(trackCell);
    addCell(row, album.vinylCondition || album.condition);
    addCell(row, album.sleeveCondition);
    addCell(row, album.genre);
    addCell(row, album.storageLocation);
    addCell(row, album.releaseDate);
    addCell(row, album.pressingYear);
    
    const hasPurchasePrice =
    album.purchasePrice !== "" &&
    album.purchasePrice !== null &&
    album.purchasePrice !== undefined;
    
    const formattedPurchasePrice = hasPurchasePrice
    ? new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD"
    }).format(Number(album.purchasePrice))
    : "No purchase price recorded";
  
    addCell(row, formattedPurchasePrice);
    addCell(row, album.owner);
    const updatedAt = Date.parse(album.updatedAt);
    const formattedUpdatedAt = Number.isFinite(updatedAt)
      ? new Date(updatedAt).toLocaleString()
      : "Not recorded";

    addCell(row, formattedUpdatedAt);

    const actionsCell = document.createElement("td");

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "View / Edit";
      editButton.addEventListener("click", () => loadAlbumForEditing(album));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
          `Delete "${album.album}" by ${album.artist}? This cannot be undone.`
        );

        if (!confirmed) {
          return;
        }

        try {
          await deleteAlbum(album.id);
          await renderAlbums();
        } catch (error) {
          console.error("Could not delete record:", error);
          alert("The record could not be deleted. Please try again.");
        }
      });

    actionsCell.append(editButton, " ", deleteButton);
    row.appendChild(actionsCell);
    tableBody.appendChild(row);
  }

}

function loadAlbumForEditing(album) {
  editingAlbumId = album.id;
  albumImageInput.value = "";
  pendingAlbumImages = [];
  albumImagePreview.replaceChildren();
  editingAlbumImages = Array.isArray(album.images) ? album.images : [];
  renderAlbumImagePreview(editingAlbumImages);
  addRecordPanel.open = true;
  form.elements.artist.value = album.artist || "";
  form.elements.album.value = album.album || "";
  form.elements.genre.value = album.genre || "";
  form.elements.owner.value = album.owner || "";
  form.elements.storageLocation.value = album.storageLocation || "";
  form.elements.releaseDate.value = album.releaseDate || "";
  form.elements.pressingYear.value = album.pressingYear || "";
  form.elements.purchasePrice.value = album.purchasePrice || "";
  form.elements.vinylCondition.value =
  album.vinylCondition || album.condition || "";
  form.elements.sleeveCondition.value = album.sleeveCondition || "";
  form.elements.needsReplacement.checked = Boolean(album.needsReplacement);


  trackList.replaceChildren();

  if (album.tracks && album.tracks.length > 0) {
    album.tracks.forEach((track) => {
      trackList.appendChild(createTrackRow(track));
    });
  } else {
    trackList.appendChild(createTrackRow());
  }

  saveButton.textContent = "Save Changes";
  cancelEditButton.hidden = false;
  formHeading.textContent = "View / Edit Record";

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetFormForNewAlbum(keepPanelOpen = false) {
  editingAlbumId = null;

  if (!keepPanelOpen) {
    addRecordPanel.open = false;
  }

  form.reset();
  albumImageInput.value = "";
  pendingAlbumImages = [];
  editingAlbumImages = [];
  albumImagePreview.replaceChildren();
  trackList.replaceChildren(createTrackRow());
  saveButton.textContent = "Save Record";
  cancelEditButton.hidden = true;
  formHeading.textContent = "Add a Record";
}

addRecordPanel.addEventListener("toggle", () => {
  if (addRecordPanel.open && editingAlbumId === null) {
    resetFormForNewAlbum(true);
  }
});

addTrackButton.addEventListener("click", () => {
  trackList.appendChild(createTrackRow());
});

cancelEditButton.addEventListener("click", () => {
  resetFormForNewAlbum();
});


const albumImageInput = document.getElementById("album-images");
const albumImagePreview = document.getElementById("album-image-preview");

let pendingAlbumImages = [];
let editingAlbumImages = [];

function renderAlbumImagePreview(images) {
  albumImagePreview.replaceChildren();
  albumImagePreview.style.display = "flex";
  albumImagePreview.style.flexWrap = "wrap";
  albumImagePreview.style.alignItems = "flex-start";
  albumImagePreview.style.gap = "1.5rem 1.25rem";

  images.forEach((image, imageIndex) => {
    const thumbnailButton = document.createElement("button");
    thumbnailButton.type = "button";
    thumbnailButton.style.display = "block";
    thumbnailButton.style.padding = "0.25rem";
    thumbnailButton.setAttribute(
      "aria-label",
      `View image ${imageIndex + 1}: ${image.name}`
    );

    const thumbnail = document.createElement("img");
    thumbnail.src = image.data;
    thumbnail.alt = image.name;
    thumbnail.style.maxWidth = "120px";
    thumbnail.style.maxHeight = "120px";
    thumbnail.style.objectFit = "contain";

    thumbnailButton.appendChild(thumbnail);
    const makeCoverButton = document.createElement("button");
    makeCoverButton.type = "button";
    makeCoverButton.style.padding = "0.25rem 0.5rem";
    makeCoverButton.textContent = imageIndex === 0 ? "Current cover" : "Make cover";
    makeCoverButton.disabled = imageIndex === 0;
    makeCoverButton.setAttribute(
      "aria-label",
      imageIndex === 0 ? "Current cover" : `Make ${image.name} the cover`
    );

    makeCoverButton.addEventListener("click", () => {
      if (editingAlbumImages.includes(image)) {
        editingAlbumImages = [
          image,
          ...editingAlbumImages.filter((savedImage) => savedImage !== image)
        ];
      } else {
        editingAlbumImages = [
          image,
          ...editingAlbumImages.filter((savedImage) => savedImage !== image)
        ];
        pendingAlbumImages = pendingAlbumImages.filter(
          (pendingImage) => pendingImage !== image
        );
      }

      renderAlbumImagePreview([...editingAlbumImages, ...pendingAlbumImages]);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    const removeIcon = document.createElement("span");
    removeIcon.textContent = "×";
    removeIcon.style.transform = "translateY(-3px)";
    removeButton.appendChild(removeIcon);
    removeButton.setAttribute("aria-label", `Remove image: ${image.name}`);
    removeButton.title = "Remove image";
    removeButton.style.position = "absolute";
    removeButton.style.top = "-14px";
    removeButton.style.right = "-14px";
    removeButton.style.width = "28px";
    removeButton.style.height = "28px";
    removeButton.style.minWidth = "28px";
    removeButton.style.maxWidth = "28px";
    removeButton.style.minHeight = "28px";
    removeButton.style.maxHeight = "28px";
    removeButton.style.boxSizing = "border-box";
    removeButton.style.display = "grid";
    removeButton.style.placeItems = "center";
    removeButton.style.flexShrink = "0";
    removeButton.style.padding = "0";
    removeButton.style.border = "2px solid #c62828";
    removeButton.style.borderRadius = "50%";
    removeButton.style.backgroundColor = "#222";
    removeButton.style.color = "#c62828";
    removeButton.style.fontSize = "20px";
    removeButton.style.lineHeight = "1";
    removeButton.style.cursor = "pointer";
    removeButton.style.zIndex = "1";
    removeButton.style.cursor = "pointer";


    removeButton.addEventListener("click", () => {
      editingAlbumImages = editingAlbumImages.filter(
        (savedImage) => savedImage !== image
      );
      pendingAlbumImages = pendingAlbumImages.filter(
        (pendingImage) => pendingImage !== image
      );

      renderAlbumImagePreview([...editingAlbumImages, ...pendingAlbumImages]);
    });

    thumbnailButton.addEventListener("click", () => {
      let currentIndex = imageIndex;

      const dialog = document.createElement("dialog");
      dialog.setAttribute("aria-label", "Album art viewer");
      dialog.style.padding = "1rem";
      dialog.style.maxWidth = "90vw";
      dialog.style.maxHeight = "90vh";

      const controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.gap = "0.5rem";
      controls.style.alignItems = "center";

      const previousButton = document.createElement("button");
      previousButton.type = "button";
      previousButton.textContent = "Previous";

      const nextButton = document.createElement("button");
      nextButton.type = "button";
      nextButton.textContent = "Next";

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.textContent = "Close";

      const imageCount = document.createElement("span");

      const largeImage = document.createElement("img");
      largeImage.style.display = "block";
      largeImage.style.maxWidth = "85vw";
      largeImage.style.maxHeight = "80vh";
      largeImage.style.objectFit = "contain";
      largeImage.style.marginTop = "0.75rem";

      function showCurrentImage() {
        const currentImage = images[currentIndex];
        largeImage.src = currentImage.data;
        largeImage.alt = currentImage.name;
        imageCount.textContent = `${currentIndex + 1} of ${images.length}`;
        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === images.length - 1;
      }

      previousButton.addEventListener("click", () => {
        if (currentIndex > 0) {
          currentIndex -= 1;
          showCurrentImage();
        }
      });

      nextButton.addEventListener("click", () => {
        if (currentIndex < images.length - 1) {
          currentIndex += 1;
          showCurrentImage();
        }
      });

      closeButton.addEventListener("click", () => dialog.close());

      controls.append(
        previousButton,
        imageCount,
        nextButton,
        closeButton
      );
      dialog.append(controls, largeImage);
      document.body.appendChild(dialog);

      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      showCurrentImage();
      dialog.showModal();
    });

    const thumbnailItem = document.createElement("div");
    thumbnailItem.style.display = "inline-flex";
    thumbnailItem.style.flexDirection = "column";
    thumbnailItem.style.alignItems = "center";
    thumbnailItem.style.gap = "0.35rem";

    const thumbnailFrame = document.createElement("div");
    thumbnailFrame.style.position = "relative";
    thumbnailFrame.style.display = "inline-block";
    thumbnailFrame.append(thumbnailButton, removeButton);
    thumbnailItem.append(thumbnailFrame, makeCoverButton);
    albumImagePreview.appendChild(thumbnailItem);

  });
}



albumImageInput.addEventListener("change", async () => {
  const files = [...albumImageInput.files];

  if (files.length > 4) {
    alert("Choose up to 4 album-art images.");
    albumImageInput.value = "";
    return;
  }

  try {
    const compressedImages = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Choose image files only.");
      }

      const bitmap = await createImageBitmap(file);
      const maxDimension = 1200;
      const scale = Math.min(
        1,
        maxDimension / Math.max(bitmap.width, bitmap.height)
      );
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("The image could not be compressed."));
            }
          },
          "image/jpeg",
          0.78
        );
      });

      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      compressedImages.push({
        name: file.name,
        type: "image/jpeg",
        data
      });
    }

    pendingAlbumImages = compressedImages;
    renderAlbumImagePreview([...editingAlbumImages, ...pendingAlbumImages]);
    
  } catch (error) {
    console.error("Could not prepare album art:", error);
    alert("One or more images could not be prepared. Try different image files.");
    albumImageInput.value = "";
    pendingAlbumImages = [];
    albumImagePreview.replaceChildren();
  }
});


form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const trackRows = [...trackList.querySelectorAll(".track-row")];

  for (const row of trackRows) {
    const sideInput = row.querySelector('[name="side"]');
    const numberInput = row.querySelector('[name="trackNumber"]');

    const side = sideInput.value.trim().toUpperCase();
    const trackNumber = numberInput.value.trim();

    if (!["A", "B", "C", "D"].includes(side)) {
      alert("Track sides must be A, B, C, or D.");
      sideInput.focus();
      return;
    }

    if (
      trackNumber !== "" &&
      (!/^\d+$/.test(trackNumber) || Number(trackNumber) < 1)
    ) {
      alert("Track numbers must be positive whole numbers, or left blank.");
      numberInput.focus();
      return;
    }
  }

  const formData = new FormData(form);

  const album = {
    id: editingAlbumId || crypto.randomUUID(),
    artist: toTitleCase(formData.get("artist").trim()),
    album: toTitleCase(formData.get("album").trim()),
    genre: formData.get("genre").trim(),
    owner: (formData.get("owner") || "").trim(),
    storageLocation: formData.get("storageLocation").trim(),
    releaseDate: formData.get("releaseDate"),
    pressingYear: formData.get("pressingYear"),
    purchasePrice: formData.get("purchasePrice"),
    condition: formData.get("vinylCondition") || "",
    vinylCondition: formData.get("vinylCondition") || "",
    sleeveCondition: formData.get("sleeveCondition") || "",
    needsReplacement: form.elements.needsReplacement.checked,
    images: [...editingAlbumImages, ...pendingAlbumImages],
    tracks: getTrackData()
  };

  try {
    await saveAlbum(album);
    resetFormForNewAlbum();
    await renderAlbums();
  } catch (error) {
    console.error("Could not save record:", error);
    alert("The record could not be saved. Please try again.");
  }
});

collectionSearch.addEventListener("input", () => {
  renderAlbums().catch((error) => {
    console.error("Could not search records:", error);
  });
});

collectionSort.addEventListener("change", () => {
  renderAlbums().catch((error) => {
    console.error("Could not sort records:", error);
  });
});

replacementFilter.addEventListener("change", () => {
  renderAlbums().catch((error) => {
    console.error("Could not filter records:", error);
  });
});

genreFilter.addEventListener("change", () => {
  renderAlbums().catch((error) => {
    console.error("Could not filter by genre:", error);
  });
});

ownerFilter.addEventListener("change", () => {
  renderAlbums().catch((error) => {
    console.error("Could not filter by owner:", error);
  });
});

shoppingViewToggle.addEventListener("click", () => {
  const tableWrapper = tableBody.closest(".table-wrapper");
  const isShoppingView = tableWrapper.classList.toggle("shopping-view");

  shoppingViewToggle.setAttribute("aria-pressed", String(isShoppingView));
  shoppingViewToggle.textContent = isShoppingView
    ? "Show full collection"
    : "Shopping view";
});


trackList.appendChild(createTrackRow());

renderAlbums().catch((error) => {
  console.error("Could not load records:", error);
});
