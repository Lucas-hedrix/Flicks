const axios = require('axios');
const API_KEY = '5a666e8574d5386f671c6bc361536b56'; // From TMDBService.ts in frontend

(async () => {
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/tv/54?api_key=${API_KEY}&append_to_response=videos,credits`);
    const seasons = res.data.seasons;
    console.log(`Breaking Bad has ${seasons.length} seasons.`);
    console.log(seasons.map(s => `Season ${s.season_number} - ${s.name}`).join('\n'));
  } catch (error) {
    console.error(error);
  }
})();
