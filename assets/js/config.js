/* Visitor counters — Firebase Realtime Database.
 *
 * Only databaseURL is required: the counters talk to the Realtime Database and
 * nothing else, and apiKey is only needed for Firebase Auth, which this site
 * does not use.
 *
 * Safe to commit. This is not a credential — it is the public address of the
 * database. What protects the data is firebase-rules.json, which allows exactly
 * two things: reading the counts, and incrementing the visit counter by one.
 *
 * NEVER put a service-account key (the firebase-admin "serviceAccountKey.json")
 * in this file or anywhere in this repo. That one IS a credential and grants
 * full unrestricted access.
 *
 * Clear databaseURL to switch the counters off; the site is unaffected.
 */
window.GW_FIREBASE = {
  projectId: 'gaanawala-7e391',
  databaseURL: 'https://gaanawala-7e391-default-rtdb.firebaseio.com',
};
