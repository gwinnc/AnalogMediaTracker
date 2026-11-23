const exportBackupButton = document.getElementById("export-backup-button");
const exportOwnerBackupButton = document.getElementById("export-owner-backup-button");
const backupOwnerFilter = document.getElementById("owner-filter");

const restoreBackupFile = document.getElementById("restore-backup-file");

function isValidTrack(track) {
  return (
    track &&
    typeof track === "object" &&
    typeof track.side === "string" &&
    typeof track.trackNumber === "string" &&
    typeof track.title === "string" &&
    typeof track.issue === "string"
  );
}

function isValidAlbum(album) {
  return (
    album &&
    typeof album === "object" &&
    typeof album.id === "string" &&
    album.id.trim() !== "" &&
    typeof album.artist === "string" &&
    typeof album.album === "string" &&
    typeof album.releaseDate === "string" &&
    typeof album.pressingYear === "string" &&
    typeof album.condition === "string" &&
    Array.isArray(album.tracks) &&
    album.tracks.every(isValidTrack)
  );
}

function downloadBackup(albums, filenamePrefix) {
  const backup = {
    app: "AnalogMediaTracker",
    exportedAt: new Date().toISOString(),
    albums
  };

  const file = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = downloadUrl;
  link.download = `${filenamePrefix}-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser time to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

exportBackupButton.addEventListener("click", async () => {
  try {
    const albums = await getAlbums();
    downloadBackup(albums, "analog-media-tracker-backup");
  } catch (error) {
    console.error("Could not export the collection backup:", error);
    alert("The backup could not be created. Check the browser console for details.");
  }
});

exportOwnerBackupButton.addEventListener("click", async () => {
 const selectedOwner = backupOwnerFilter.value.trim();

  if (!selectedOwner) {
    alert("Choose an owner in the Filter by owner list first.");
    return;
  }

  try {
    const albums = await getAlbums();
    const ownerAlbums = albums.filter(
      (album) =>
        (album.owner || "").trim().toLocaleLowerCase() ===
        selectedOwner.toLocaleLowerCase()
    );

    if (ownerAlbums.length === 0) {
      alert(`No albums found for ${selectedOwner}.`);
      return;
    }

    const ownerSlug =
      selectedOwner
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "owner";

    downloadBackup(
      ownerAlbums,
      `analog-media-tracker-${ownerSlug}-backup`
    );
  } catch (error) {
    console.error("Could not export the owner's backup:", error);
    alert("The owner's backup could not be created. Check the browser console for details.");
  }
});

function albumSignature(album) {
  // Compare album contents without using the ID.
  // Sorting track copies makes track order irrelevant to duplicate detection.
  const tracks = (album.tracks || [])
    .map((track) => ({
      side: track.side || "",
      trackNumber: track.trackNumber || "",
      title: track.title || "",
      issue: track.issue || ""
    }))
    .sort((a, b) =>
      `${a.side}|${a.trackNumber}|${a.title}|${a.issue}`.localeCompare(
        `${b.side}|${b.trackNumber}|${b.title}|${b.issue}`
      )
    );

  return JSON.stringify({
    artist: (album.artist || "").trim().toLowerCase(),
    album: (album.album || "").trim().toLowerCase(),
    releaseDate: album.releaseDate || "",
    pressingYear: album.pressingYear || "",
    condition: album.condition || "",
    tracks
  });
}

restoreBackupFile.addEventListener("change", async () => {
  const file = restoreBackupFile.files[0];

  if (!file) {
    return;
  }

  try {
    const backupText = await file.text();
    const backup = JSON.parse(backupText);

    if (
      !backup ||
      backup.app !== "AnalogMediaTracker" ||
      !Array.isArray(backup.albums)
    ) {
      throw new Error("This file does not look like an AnalogMediaTracker backup.");
    }

    if (!backup.albums.every(isValidAlbum)) {
      throw new Error("One or more albums or tracks in the file are invalid.");
    }

    if (backup.albums.length === 0) {
      alert("This backup contains no albums.");
      return;
    }

        const confirmed = window.confirm(
      `Import ${backup.albums.length} album(s)? ` +
      "New albums will be added. Albums with matching IDs will be updated " +
      "from this backup. Albums with matching content but different IDs " +
      "will be skipped. Albums missing from the backup will not be deleted. " +
      "If both devices have edits to the same album, the backup version will replace them."
    );

    if (!confirmed) {
      return;
    }

    const existingAlbums = await getAlbums();
    const knownAlbums = [...existingAlbums];
    const indexById = new Map(
      existingAlbums.map((album, index) => [album.id, index])
    );

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const originalAlbum of backup.albums) {
      const album = {
        ...originalAlbum,
        tracks: originalAlbum.tracks.map((track) => ({ ...track }))
      };

      const existingIndex = indexById.get(album.id);

      if (existingIndex !== undefined) {
        await saveAlbum(album);
        knownAlbums[existingIndex] = album;
        updatedCount += 1;
        continue;
      }

      const matchingContent = knownAlbums.some(
        (existingAlbum) =>
          albumSignature(existingAlbum) === albumSignature(album)
      );

      if (matchingContent) {
        skippedCount += 1;
        continue;
      }

      await saveAlbum(album);
      indexById.set(album.id, knownAlbums.length);
      knownAlbums.push(album);
      importedCount += 1;
    }

    await renderAlbums();

    alert(
      `Added ${importedCount} album(s), updated or re-saved ${updatedCount}, ` +
      `and skipped ${skippedCount} album(s) with matching content.`
    );



  } catch (error) {
    console.error("Could not restore the backup:", error);
    alert(
      "The backup could not be restored. Make sure you selected a valid " +
      "AnalogMediaTracker JSON backup."
    );
  } finally {
    restoreBackupFile.value = "";
  }
});
