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

function getTrackData() {
  return [...trackList.querySelectorAll(".track-row")]
    .map((row) => {
      const value = (name) =>
        row.querySelector(`[name="${name}"]`).value.trim();

      return {
        side: value("side").toUpperCase(),
        trackNumber: value("trackNumber"),
        title: value("title"),
        issue: value("issue")
      };
    })
    .filter((track) => track.title || track.issue);
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


function compareAlbums(first, second, sortMode) {
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

    return (first.artist || "").localeCompare(second.artist || "", undefined, {
      sensitivity: "base",
      numeric: true
    });
}
function getArtistInitial(artist) {
  const initial = (artist || "").trim().charAt(0).toLocaleUpperCase();
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

  const sortMode = collectionSort.value;

  matchingAlbums.sort((first, second) =>
    compareAlbums(first, second, sortMode)
  );
  updateArtistLetterNav(matchingAlbums, sortMode);
  tableBody.replaceChildren();

  if (matchingAlbums.length === 0) {
    const row = document.createElement("tr");
    row.dataset.artistInitial = getArtistInitial(album.artist);
    const cell = document.createElement("td");

    cell.colSpan = 13;
    cell.textContent = searchTerm
      ? "No records match your search."
      : "Your collection is empty.";

    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  for (const album of matchingAlbums) {
  const row = document.createElement("tr");
  addCell(row, album.artist);
  addCell(row, album.album);
  addCell(row, album.needsReplacement ? "Needs replacement" : "No");
  addCell(row, summarizeIssues(album.tracks || []));
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

function resetFormForNewAlbum() {
  editingAlbumId = null;
  addRecordPanel.open = false;
  form.reset();
  trackList.replaceChildren(createTrackRow());
  saveButton.textContent = "Save Record";
  cancelEditButton.hidden = true;
  formHeading.textContent = "Add a Record";
}

addTrackButton.addEventListener("click", () => {
  trackList.appendChild(createTrackRow());
});

cancelEditButton.addEventListener("click", resetFormForNewAlbum);

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
    artist: formData.get("artist").trim(),
    album: formData.get("album").trim(),
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
