import { getGlobalSettings, saveGlobalSettings } from '../store.js';

async function updateTitles() {
  console.log("Fetching global settings...");
  try {
    const settings = await getGlobalSettings();
    if (settings.jobTitles && Array.isArray(settings.jobTitles)) {
      console.log("Original jobTitles:", settings.jobTitles);
      const newTitles = settings.jobTitles.map(title => {
        let newTitle = title.replace(/^موظف\s+/i, '').trim();
        // Just in case there are other variations
        newTitle = newTitle.replace(/^موظفة\s+/i, '').trim();
        return newTitle;
      });
      console.log("New jobTitles:", newTitles);
      settings.jobTitles = newTitles;
      await saveGlobalSettings(settings);
      console.log("Successfully updated jobTitles in Firebase!");
      process.exit(0);
    } else {
      console.log("No jobTitles found in settings.");
      process.exit(0);
    }
  } catch (err) {
    console.error("Error updating settings:", err);
    process.exit(1);
  }
}

updateTitles();
