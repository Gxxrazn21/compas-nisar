// English dictionary. Must have exactly the same keys and placeholders as es.ts.
import type { Key } from './es';

export const en: Record<Key, string> = {
  'score.fixedPair': 'Saved comparison: fixed dates',
  'score.channel': 'Listen to',
  'score.scaleShort': 'What you hear',
  'score.pointSelected': 'selected point: {lat}, {lon}',
  'score.pointCenter': 'area center: {lat}, {lon}',
  'score.noPoint': 'no point selected',
  'score.scale': 'HH and HV share a scale of −16 to +1 approximate dB relative to the scene. More return produces a higher note. These are measurements converted to sound, not audio captured by the satellite. Each channel is normalized independently, so their absolute powers cannot be compared.',
  'score.timing': 'One observation plays every 0.7 seconds. Dates and intervals show actual elapsed time; missing acquisitions are not interpolated.',
  'score.reference': 'Images preserve the colors or grayscale of the original preview. Notes are normalized to the {date} reference and average a window with radius {radius} pixels around the point.',
  'dance.color.hh-hv': 'Purple: HH · Green: HV',
  'dance.color.vv-vh': 'Purple: VV · Green: VH',
  'dance.color.hh': 'Grayscale: one channel, HH',
  'dance.color.vv': 'Grayscale: one channel, VV',
  'dance.color.quad': 'Preview with multiple polarizations',
  'dance.color.unknown': 'Original preview colors',
  'dance.colorHelp': 'Why do I see gray, purple or green?',
  'dance.grayExplanation': 'This acquisition has a single polarization: there are not two channels to form the purple–green composite. Gray shows echo intensity: lighter means more return; darker means less return. This is the original image, not a playback error.',
  'dance.colorExplanation': 'In an HH/HV composite, HH is shown with red and blue together (purple), and HV with green. HH receives the echo in the same horizontal orientation in which it was transmitted; HV receives it vertically. HV provides information about scattering within structures such as branches and leaves. VV/VH uses the same idea, with vertical transmission.',
  'dance.colorLimits': 'These are display colors, not natural colors or labels for water, forest or damage. Moisture, roughness and geometry also affect the signal. Brightness is adjusted for each preview: to assess change between dates, use the change layers and the analysis panel.',
  'score.noValue': 'no return value',
  'score.value': '{channel}: {db} approximate dB',
  'dance.first': 'First observation',
  'dance.gap': '{days} days since the previous observation',
  'dance.partial': 'Partial playback: {n} of {total} images did not load.',
  'dance.failed': '{n} of {total} images did not load.',
  'dance.retry': 'Retry images',
  'brand': 'SARitmo',
  'doc.title': 'SARitmo, the NISAR radar through time',
  'top.method': 'Method',
  'top.langLabel': 'Language',
  'top.home': 'SARitmo, go to the cover',
  'top.back': 'All stories',

  'cover.title': 'Every 12 days, a radar listens to how the Earth changes',
  'cover.tempo': 'program of stories',
  'cover.intro':
    'NISAR sees through clouds and night. Pick a story and see what changed between two of its passes.',
  'cover.programLabel': 'Available stories',
  'cover.loadingStories': 'Looking for the stories on the server…',
  'cover.storiesError':
    'The stories could not be loaded. Check that the SARitmo server is running and try again.',
  'cover.earth': 'Earth today, {date}',
  'cover.earthAlt': 'Image of the whole Earth taken by the DSCOVR satellite',

  'story.panelLabel': 'Story guide',
  'story.stepOf': 'Step {n} of {total}',
  'story.steps': 'Story steps',
  'story.prev': 'Previous',
  'story.next': 'Next',
  'story.sources': 'Learn more',
  'story.lens': 'Reading lens: {lens}',
  'story.comparing': 'Comparing {before} with {after}',
  'story.free.title': 'Comparison of stack {stack}',
  'story.free.text': 'Pick two notes on the score and press “Compare these dates”.',
  'story.danceHint': 'Fetches the full series of passes and plays it over the map.',

  'load.title': 'Computing the change',
  'load.fresh':
    'If this comparison is new, we download two NISAR images of about 5 MB each and align them. It usually takes 5 to 20 seconds.',
  'load.elapsed': '{s} seconds so far.',
  'load.slow': 'This is taking longer than usual; the NASA service may be slow.',
  'err.title': 'The change could not be computed',
  'err.network':
    'There is no connection to the SARitmo server. Check that it is running and try again.',
  'err.notFound':
    'There is no NISAR data for that pair of dates at this place. Try two other passes on the score.',
  'err.invalid': 'Those dates cannot be compared: {detail}',
  'err.invalidPlain':
    'Those dates cannot be compared. Pick two analyzable passes taken in the same acquisition mode.',
  'err.upstream': 'NASA’s image service did not respond. Wait a moment and try again.',
  'err.generic': 'Something went wrong computing the change. Try again in a moment.',
  'err.retry': 'Try again',

  'layer.group': 'Map layer',
  'layer.before': 'Before',
  'layer.after': 'After',
  'layer.swipe': 'Curtain',
  'layer.change_hh': 'HH change',
  'layer.change_hv': 'HV change',
  'layer.classes': 'Signals',
  'layer.composite': 'Composite',
  'layer.hint.before':
    'The earlier pass, as NASA publishes it. Brightness: echo strength. Purple: HH dominates. Green: HV dominates.',
  'layer.hint.after':
    'The later pass, as NASA publishes it. Brightness: echo strength. Purple: HH dominates. Green: HV dominates.',
  'layer.hint.swipe':
    'Drag the curtain to compare: before on the left, after on the right.',
  'layer.hint.change_hh':
    'Difference between the two dates in the HH channel (ground, water, buildings). Blue: the echo dropped. Red: it rose.',
  'layer.hint.change_hv':
    'Difference between the two dates in the HV channel (vegetation). Blue: the echo dropped. Red: it rose.',
  'layer.hint.classes':
    'The possible signals that come from combining HH and HV, in the colors of the panel list.',
  'layer.hint.composite':
    'Before in cyan and after in red. Gray: no change. Red: more echo now. Cyan: more echo before.',
  'map.opacity': 'Layer opacity',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  'map.backToArea': 'Back to the area',
  'map.curtain': 'Curtain between before and after',
  'map.curtainBefore': 'Before: {date}',
  'map.curtainAfter': 'After: {date}',
  'map.label': 'Interactive map of the planet',
  'map.attribution':
    'Satellite imagery: Esri, Maxar, Earthstar Geographics and the GIS user community. Radar: NISAR, NASA and ISRO, via ASF.',
  'sheet.toggle': 'Show or hide the panel',

  'read.title': 'Reading',
  'read.summary': '{between}, a possible change showed up across {changed} of the {valid} observed.',
  'read.summaryNone': '{between}, no change above the threshold showed up across the {valid} observed.',
  'read.days': 'There were {days} days between the two passes.',
  'conf.reason.missing': 'HH correlation between dates could not be measured.',
  'conf.coverage': 'Common data coverage: {value} of cells in this window.',
  'conf.coverage.unknown': 'Numeric coverage is unavailable in this saved result.',
  'conf.interpretation': 'Interpretation has no independent corroboration: no class confirms an event.',
  'conf.alta':
    'High quality of the global HH fit',
  'conf.media':
    'Medium quality of the global HH fit',
  'conf.baja':
    'Low quality of the global HH fit',
  'conf.reason.corr':
    'HH correlation between dates is {value}. This may reflect widespread change or different stretches; it does not validate the classes.',
  'conf.reason.fit':
    '{value} of pixels agree with the fit between dates; the method criterion is at least 80%.',
  'conf.lead.media':
    'Global normalization has limitations. Classified areas require independent verification.',
  'conf.lead.baja':
    'The global fit has limited support. Class and area accuracy have not been measured.',

  'classes.title': 'What changed',
  'classes.legend': 'Map classes and their extent',
  'classes.none': 'No area passed the 3 dB threshold between these two dates.',
  'classes.share': 'Each bar is compared with the largest class.',

  'probe.title': 'A point on the map',
  'probe.hint': 'Click the map to see how much the radar return changed at that point.',
  'probe.loading': 'Querying the point…',
  'probe.invalid': 'That point is outside the frame or has no data. Try somewhere else.',
  'probe.error': 'That point could not be queried. Try again.',
  'probe.before': 'Before',
  'probe.after': 'After',
  'probe.delta': 'Change',
  'probe.class': 'Class',
  'probe.stable': 'No change above the threshold',
  'probe.note': 'Values in dB relative to the scene, not calibrated.',
  'probe.at': 'Point {lon}, {lat}',
  'probe.marker': 'Probed point',

  'hist.title': 'How much the return changed (HH)',
  'hist.axis': 'Change in approximate dB',
  'hist.desc':
    'Histogram of per-pixel change between the two dates. On the left the return dropped; on the right it rose. The lines mark the 3 dB threshold.',

  'prov.title': 'Provenance',
  'prov.before': 'Before',
  'prov.after': 'After',
  'prov.quality.validated': 'validated',
  'prov.quality.provisional': 'provisional',
  'prov.quality.beta': 'beta',
  'prov.track': 'Track {track}, frame {frame}, {direction} orbit',
  'prov.direction.DESCENDING': 'descending',
  'prov.direction.ASCENDING': 'ascending',
  'prov.pol.dual': 'Dual polarization (HH and HV)',
  'prov.pol.single': 'Single polarization (HH only)',
  'prov.georef.kml': 'Corners taken from the scene’s official KML file.',
  'prov.georef.stack-kml':
    'Corners taken from the KML of another scene in the same stack; the grid is fixed within a stack.',
  'prov.georef.footprint':
    'Corners estimated from the published footprint: an error of 1 to 3 pixels.',
  'prov.asf': 'View on ASF',
  'prov.asfLabel': 'View the {date} product in the ASF search',
  'prov.mode': 'Acquisition mode {mode}',
  'prov.cycle': 'cycle {cycle}',

  'limits.title': 'Limits',
  'limits.1': 'Decibels are approximate: they come from preview images, not calibrated data.',
  'limits.2':
    'The change is measured relative to the whole scene: whatever changes equally across the frame, such as general moisture after rain, is absorbed.',
  'limits.3':
    'Where the surface is very dark or very bright, the real change can be larger than shown.',
  'limits.4': 'Every class is a hypothesis, never a confirmed event.',
  'limits.provisional': 'At least one of the scenes is provisional and may change once validated.',
  'limits.method': 'How it is computed, step by step',

  'score.title': 'Score',
  'score.tempo': 'every 12 days',
  'score.label': 'Score of NISAR passes: each note is one pass of the radar',
  'score.compare': 'Compare these dates',
  'score.compareSame': 'These dates are already on the map.',
  'score.compareNeed': 'First pick the two notes, before and after.',
  'score.dance': 'Watch the dance',
  'score.pickBefore': 'Pick the “before” note.',
  'score.pickAfter': 'Now pick the “after” note.',
  'score.ready': 'Ready: press “Compare these dates”.',
  'score.before': 'before',
  'score.after': 'after',
  'score.noteAria': '{date}, {quality}',
  'score.noteBefore': '{date}, {quality}, before note',
  'score.noteAfter': '{date}, {quality}, after note',
  'score.blocked.not-analyzable':
    'This pass belongs to the beta collection: it only has a preview and cannot be compared.',
  'score.blocked.other-mode':
    'That pass was taken in another acquisition mode ({mode}); only dates in the same mode ({anchor}) can be compared.',
  'score.blocked.same-date': 'Pick a date different from the “before” one.',
  'score.pitch': 'The higher the note, the more radar return at the center of the area.',
  'score.loading': 'Loading the score…',
  'score.error': 'The score of this stack could not be loaded.',

  'dance.series':
    'Asking NISAR for the series of passes. {s} seconds so far; the first time it can take up to a minute.',
  'dance.preload': 'Preparing frames: {n} of {total}.',
  'dance.error': 'The dance could not be prepared. Try again.',
  'dance.errorDetail': 'The dance could not be prepared: {detail}',
  'dance.controls': 'Dance controls',
  'dance.play': 'Play',
  'dance.pause': 'Pause',
  'dance.stop': 'Leave the dance',
  'dance.loop': 'Loop',
  'dance.prev': 'Previous frame',
  'dance.next': 'Next frame',
  'dance.frame': 'Frame {n} of {total}, {date}',
  'dance.point': 'Each note rises or falls with the {channel} return at the marked point.',
  'dance.cancel': 'Cancel',

  'method.title': 'How the change is computed',
  'method.close': 'Close',
  'method.intro':
    'SARitmo does not measure the ground: it compares two radar photographs of the same place and points out where the signal changed. This is the full recipe.',
  'method.s1.title': 'Where the images come from',
  'method.s1.text':
    'NISAR is a radar from NASA and the Indian space agency (ISRO). It passes over the same place every 12 days and sees it at night and through clouds. We use the preview images NASA publishes for each pass, with two channels: HH and HV, two ways of sending and receiving the signal.',
  'method.s2.title': 'Why they cannot simply be subtracted',
  'method.s2.text':
    'Each preview image is stretched on its own: clipped between its 5th and 95th percentiles and compressed with a square root. Two dates do not share a scale. Before comparing, the method brings them to a common scale with a robust linear fit over the whole frame, and only compares the range where both images carry information.',
  'method.s3.title': 'What “approximate dB” means',
  'method.s3.text':
    'A decibel is a logarithmic way of saying how many times the signal changed: 3 dB is roughly double or half. Because we start from stretched images rather than calibrated data, the dB are approximate: they help locate and rank changes, not quote a physical value. On very dark or very bright surfaces the real change can be larger than shown.',
  'method.s4.title': 'How it is classified',
  'method.s4.text':
    'A pixel counts as changed if the signal rises or drops by 3 dB or more. Then we look at which channel changed and whether the surface was dark, like water or wet snow: that gives seven classes. The name you see depends on the lens, because the same signal means different things in a rainforest and on a glacier.',
  'method.s5.title': 'Why everything says “possible”',
  'method.s5.text':
    'A radar does not see water: it sees how the signal bounces. A drop in return fits new water, but also other causes. That is why every label is a hypothesis to look at more closely, never a confirmed event.',
  'method.s6.title': 'What this tool cannot claim',
  'method.s6.1': 'It does not measure floods, deforestation or melt with calibrated values.',
  'method.s6.2': 'It cannot tell the cause of a change, only that the signal changed.',
  'method.s6.3':
    'A change that affects the whole scene equally, such as general moisture after rain, is absorbed by the normalization.',
  'method.s6.4': 'It only compares passes taken in the same acquisition mode.',
  'method.s6.5':
    'Image fit quality is not certainty about the cause. A poor fit may indicate extensive change or comparability problems; data coverage is reported separately.',
  'method.formula': 'Reference formula',
  'method.formulaText': 'Δ ≈ 10·log10((q₂ + c) / (α·q₁ + β + c)), with q = ((ND − 1) / 254)² and c = 0.03',
  'method.sources': 'Sources and version',
  'method.sourcesText':
    'Images: NISAR GCOV (NASA and ISRO), distributed by ASF DAAC. Base map: Esri World Imagery. Earth today: NASA EPIC. Browse method: 4; GCOV lens: 3; series: 2.',

  'resources.title': 'Open resources from the challenge',
  'resources.intro':
    'The resources suggested by the "Dancing with the SARs" challenge and the role each one plays in SARitmo. The app processes NISAR data; the Canadian and Argentine radars are listed as sources for cross-checking and are not processed here yet.',
  'resources.group.nasa': 'NASA',
  'resources.group.csa': 'Canadian Space Agency (CSA)',
  'resources.group.conae': "Argentina's National Commission for Space Activities (CONAE)",
  'resources.earthdataSearch.name': 'Earthdata Search',
  'resources.earthdataSearch.use':
    "Search tool for NASA's catalog. SARitmo queries that same catalog (CMR) to find which NISAR passes cover each point.",
  'resources.asfSearch.name': 'ASF Data Search (Vertex)',
  'resources.asfSearch.use':
    "NASA's radar archive in Alaska. Every product SARitmo cites links to its record here, so provenance can be checked.",
  'resources.nisarDocs.name': 'NISAR documentation',
  'resources.nisarDocs.use': 'Describes the GCOV and GUNW products SARitmo reads and the ways to access them.',
  'resources.remoteSensing.name': 'Remote sensing basics',
  'resources.remoteSensing.use': "NASA's introduction to observing Earth from space.",
  'resources.sarBasics.name': 'What is synthetic aperture radar',
  'resources.sarBasics.use':
    'Explains bands, polarization and interferometry: the background for reading the change maps and hypotheses in SARitmo.',
  'resources.arset.name': 'ARSET trainings',
  'resources.arset.use':
    'Free NASA courses on applied remote sensing, including surface water with radar and ground displacement with NISAR.',
  'resources.storymaps.name': 'NISAR StoryMaps',
  'resources.storymaps.use':
    'Five map-based stories: floods, wildfires, oil slicks, glacial motion and land subsidence.',
  'resources.societal.name': 'NISAR societal benefits',
  'resources.societal.use':
    'Two-page briefs per application: floods, food security, glaciers, volcanoes and more. Background reading for the hypotheses behind each change class.',
  'resources.uavsar.name': 'UAVSAR postcards',
  'resources.uavsar.use':
    'Images from the airborne L-band radar that preceded NISAR. Two match stories in SARitmo: Kilauea and Vatnajökull.',
  'resources.rcm.name': 'RADARSAT Constellation Mission (RCM)',
  'resources.rcm.use':
    "Three C-band satellites with part of their products openly available. Useful for cross-checking against NISAR's L band.",
  'resources.csaTutorial.name': 'Synthetic aperture radar tutorial',
  'resources.csaTutorial.use': "Beginner's guide: loading and plotting RADARSAT images in QGIS and Python.",
  'resources.radarsat1.name': 'RADARSAT-1 archive',
  'resources.radarsat1.use':
    'C-band images from 1995 to 2013 under an open licence. They show the same place decades before NISAR.',
  'resources.saocomCatalog.name': 'SAOCOM catalog',
  'resources.saocomCatalog.use':
    'Argentine L-band radar, the same band as NISAR. Searching and viewing thumbnails is free; downloading requires registration and a licence.',
  'resources.saocomAccess.name': 'Access to the SAOCOM archive',
  'resources.saocomAccess.use':
    'Since February 2023, any registered person can access archive products over Argentine territory.',

  'nav.label':
    'Sections',
  'nav.stories':
    'Stories',
  'nav.explore':
    'Explore',
  'nav.live':
    'Live',
  'explore.panelLabel':
    'Explore the world',
  'explore.title':
    'Explore any place',
  'explore.intro':
    'Click the globe, search for a city or an address, or type some coordinates. We list the stacks of NISAR passes that cover that point.',
  'explore.titleShort':
    'Explore',
  'explore.place.label': 'City or address',
  'explore.place.placeholder': 'Montería, Colombia',
  'explore.place.go': 'Find place',
  'explore.place.searching': 'Looking for the place…',
  'explore.place.empty': 'We could not find that place. Try another name or add the country.',
  'explore.place.error': 'The place search could not be reached. Try again or use coordinates.',
  'explore.place.showing': 'Place: {name}',
  'explore.place.others': 'Other results',
  'explore.place.credit': 'Place search: © OpenStreetMap contributors.',
  'explore.lon':
    'Longitude',
  'explore.lat':
    'Latitude',
  'explore.go':
    'Find stacks',
  'explore.coordsInvalid':
    'Enter a longitude between −180 and 180 and a latitude between −90 and 90.',
  'explore.examples':
    'Places to try',
  'explore.ex.mojana':
    'La Mojana, Colombia',
  'explore.ex.iceland':
    'Iceland',
  'explore.ex.california':
    'California Central Valley',
  'explore.ex.punjab':
    'Punjab, India',
  'explore.point':
    'Point {lon}, {lat}.',
  'explore.otherPlace':
    'Pick another place',
  'explore.searching':
    'Looking for NISAR stacks over this point…',
  'explore.stacksError':
    'Could not fetch the NISAR stacks. Check that the SARitmo server is running and pick the point again.',
  'explore.empty.title':
    'NISAR has no data here yet',
  'explore.empty.text':
    'No GCOV stack covers this point: NISAR does not yet observe the whole planet with this product. Try another place, for example one of these.',
  'explore.stacksTitle':
    'Stacks covering this point: {n}',
  'explore.stacksHelp':
    'A stack is the series of NISAR passes over one frame, from the same track and in the same direction. Pick one to see its footprint and dates.',
  'explore.stackTitle':
    'Track {track}, frame {frame}, {direction}',
  'explore.stackDates':
    '{n} analyzable dates out of {total}',
  'explore.stackRange':
    'from {first} to {last}',
  'explore.stackPol':
    'Polarizations: {pol}',
  'explore.otherStack':
    'See the other stacks at this point',
  'explore.around.pair':
    'We picked the passes around the event: the last one before it and the first one after it. Check the dates and press “Compare these dates”.',
  'explore.around.urgent-pair':
    'We picked this urgent acquisition as “after” and the last earlier pass in the same mode as “before”. Check the dates and press “Compare these dates”.',
  'explore.around.urgent-single':
    'This urgent acquisition is already in the stack, but there is no other pass in the same mode to compare it with yet.',
  'explore.around.before-only':
    'There is no pass after the event yet. We selected the last one before it; once NISAR flies over again you can compare it with the new one.',
  'explore.around.none':
    'No stack at this point has analyzable passes before and after that date. Pick a stack and the dates you want.',
  'explore.lens':
    'Reading lens',
  'explore.lensHelp':
    'It changes how signals are named depending on the terrain.',
  'explore.area':
    'Analysis area',
  'explore.area.view':
    'Current map view',
  'explore.area.full':
    'Full frame',
  'explore.area.viewHelp':
    'Zoom in on the area before comparing: what you see is analyzed, clipped to the footprint. It is clearer and faster.',
  'explore.area.fullHelp':
    'The whole frame of the stack is analyzed, whatever the map shows.',
  'explore.areaNote.view':
    'The map view at the moment of comparing was analyzed.',
  'explore.areaNote.full':
    'The full frame was analyzed.',
  'explore.areaNote.covers':
    'The view covered almost the whole frame, so the full frame was analyzed.',
  'explore.areaNote.outside':
    'The view was outside the frame, so the full frame was analyzed.',
  'explore.pickHint':
    'On the score, pick the “before” note and the “after” note, then press “Compare these dates”.',
  'explore.scoreEmpty':
    'Pick a place and a stack: its passes will appear here as notes.',
  'explore.marker':
    'Point chosen to explore',
  'live.panelLabel':
    'What is happening now',
  'live.title':
    'Live',
  'live.intro':
    'What is happening on Earth right now, what NISAR has just observed and where it is flying.',
  'live.tabs':
    'What to show on the map',
  'live.tab.events':
    'Events',
  'live.tab.urgent':
    'Urgent',
  'live.events.loading':
    'Fetching the events of the last few days…',
  'live.events.error':
    'Natural events could not be loaded. The NASA service may be slow.',
  'live.events.count':
    '{n} events from the last {days} days',
  'live.events.none':
    'No category is visible: turn one on above.',
  'live.events.list':
    'Events sorted by date',
  'live.filter':
    'Filter by category',
  'live.showAll':
    'Show all',
  'live.more':
    'Show {n} more',
  'live.card':
    'Selected item',
  'live.closed':
    'closed',
  'live.open':
    'ongoing',
  'live.linkEonet':
    'See on EONET',
  'live.linkSource':
    'See the source',
  'live.explore':
    'Explore the NISAR passes here',
  'live.exploreHelp':
    'Takes you to Explore at this point and preselects the passes around the date, if they exist.',
  'live.urgent.loading':
    'Fetching the latest urgent acquisitions…',
  'live.urgent.error':
    'Urgent acquisitions could not be loaded. Try again in a moment.',
  'live.urgent.intro':
    'NISAR publishes what it observes during an emergency almost in real time. The violet footprints on the map are those areas.',
  'live.urgent.stack':
    'Stack {stack}, products {products}',
  'live.urgent.exploreHelp':
    'Takes you to Explore on this stack with this pass as “after” and the previous one in the same mode as “before”.',
  'live.urgent.preview':
    'See the preview',
  'live.urgent.list':
    'Urgent acquisitions, newest first',
  'live.sources':
    'Sources: events from NASA EONET; NISAR urgent-response acquisitions from ASF DAAC; NISAR orbit from CelesTrak.',
  'live.footer':
    'Events: NASA EONET. Acquisitions: NISAR, NASA and ISRO, via ASF. Orbit: CelesTrak. Satellite imagery: Esri, Maxar, Earthstar Geographics and the GIS user community.',
  'cat.wildfires':
    'Wildfires',
  'cat.floods':
    'Floods',
  'cat.severeStorms':
    'Severe storms',
  'cat.volcanoes':
    'Volcanoes',
  'cat.earthquakes':
    'Earthquakes',
  'cat.landslides':
    'Landslides',
  'cat.drought':
    'Drought',
  'cat.dustHaze':
    'Dust and haze',
  'cat.seaLakeIce':
    'Sea and lake ice',
  'cat.snow':
    'Snow',
  'cat.tempExtremes':
    'Extreme temperatures',
  'cat.waterColor':
    'Water color',
  'cat.manmade':
    'Human-caused events',
  'lupa.title':
    'Calibrated lens',
  'lupa.helpProbe':
    'Reads the full calibrated NISAR product in a window around the point you probed.',
  'lupa.helpCenter':
    'Reads the full calibrated NISAR product in a window around the map center. If you probe a point, the window is centered there.',
  'lupa.size':
    'Window size',
  'lupa.sizeKm':
    '{n} km',
  'lupa.open':
    'Calibrated lens here',
  'lupa.slow':
    'The first time it downloads 50 to 90 MB and takes 20 to 40 seconds.',
  'lupa.badge':
    'Calibrated lens',
  'lupa.badgeText':
    'Real dB of calibrated γ⁰ at {res} m, in a {size} km window. These are not the approximate dB of the overview.',
  'lupa.back':
    'Back to the overview',
  'lupa.load.title':
    'Reading the calibrated product',
  'lupa.load.text':
    'We read a {size} km window of the full NISAR GCOV product, which weighs about 6 GB; we only download the window.',
  'lupa.load.open':
    'Opening the file and reading its metadata…',
  'lupa.load.read':
    'Downloading the window for both dates, 50 to 90 MB…',
  'lupa.load.calc':
    'Computing the change in real dB…',
  'lupa.load.cache':
    'The windows of the stories are already cached and answer instantly.',
  'lupa.load.cancel':
    'Cancel and go back to the overview',
  'lupa.err.title':
    'The calibrated lens could not be opened',
  'conf.gcov.title':
    'Calibrated return: no global fit between dates',
  'conf.gcov.text':
    'Calibration allows power comparison. It does not guarantee class accuracy or confirm a cause.',
  'probe.noteCal':
    'Values in real dB of calibrated γ⁰.',
  'hist.axisCal':
    'Change in real dB',
  'prov.georef.product':
    'Corners computed from the projection of the calibrated product itself.',
  'prov.resolution':
    'Resolution of {m} m per pixel.',
  'limits.cal.1':
    'Decibels are real (calibrated γ⁰), but each 30 m pixel averages 3×3 pixels of 10 m: radar speckle leaves a few dB of noise in single pixels.',
  'limits.cal.2':
    'There is no normalization between dates: a general change in moisture or roughness does show up.',
  'limits.cal.3':
    'It only covers a 10 to 20 km window, not the whole scene.',
  'story.zoomHint':
    'The right-hand panel switches to real dB. Use “Back to the overview” to return to the full map.',
  'read.collapse':
    'Collapse reading',
  'read.expand':
    'Show reading',
  'export.title':
    'Export',
  'export.json':
    'Download report (JSON)',
  'export.copy':
    'Copy link',
  'export.help':
    'The report includes dates, method, statistics, provenance and limits. The link reopens this same view.',
  'export.copied':
    'Link copied.',
  'export.copyFail':
    'Could not copy: copy the address from the browser bar.',
  'export.layers':
    'Download the layers (PNG)',
  'basemap.group':
    'Base map',
  'basemap.sat':
    'Satellite',
  'basemap.optical':
    'Optical of the day',
  'basemap.hint':
    'Daily optical image for the “after” date: what a satellite that cannot see through clouds would see.',
  'basemap.swipeHint':
    'Not available with the curtain.',
  'basemap.note':
    'Optical of the day, {date}: what an optical satellite would have seen. Often only clouds show; NISAR’s radar sees through them.',
  'basemap.attribution':
    'Optical imagery: NASA GIBS, VIIRS.',
  'layer.group.image':
    'Image',
  'layer.group.change':
    'Change',
  'layer.group.reading':
    'Reading',
  'map.zoomGroup':
    'Zoom',
  'ig.loading':
    'Looking for the latest interferograms over this place…',
  'ig.error':
    'Interferograms could not be loaded. Try again in a moment.',
  'ig.errorDetail':
    'Interferograms could not be loaded: {detail}',
  'ig.none':
    'There are no recent interferograms over this point.',
  'ig.pairTrack':
    'Track {track}, {direction}',
  'ig.pairs':
    'Date pairs',
  'ig.pairDates':
    'From {reference} to {secondary}',
  'ig.sentence':
    'Interferogram between the reference pass of {reference} and the secondary pass of {secondary}.',
  'ig.sentenceNone':
    'NISAR interferograms over this place.',
  'ig.what.title':
    'What you are looking at',
  'ig.what.text':
    'An interferogram compares the phase of the radar wave between two passes. If the ground moved between them, the phase changes, and the change is painted in color.',
  'ig.fringes':
    'Each fringe, one full color cycle, corresponds to ground motion of half a wavelength along the radar line of sight: in L-band, about 12 cm.',
  'ig.product.title':
    'An official product, unprocessed',
  'ig.product.text':
    'The image is the official preview of NISAR’s provisional GUNW product, as NASA publishes it. SARitmo does not recompute or interpret it.',
  'ig.georef':
    'The georeferencing is approximate: it is estimated from the scene footprint, not from the product’s own geolocation.',
  'ig.limit.1':
    'Fringes can come from ground motion, but also from the atmosphere and from topography.',
  'ig.limit.2':
    'To measure centimeters you need the product data, not its preview image.',
  'ig.limit.3':
    'Where the image has no color there is no data, or the signal was lost between the two passes.',
  'ig.source':
    'Source: NISAR provisional GUNW, distributed by ASF DAAC.',
  'method.s7.title':
    'The calibrated lens',
  'method.s7.text':
    'The lens reads GCOV γ⁰ in a 10 to 20 km window. Spacing comes from product metadata and power is averaged; in the La Mojana case, output cells are 30 m. No global fit between dates is applied. The threshold is 3 dB and “dark” means HH of −18 dB or less. Classes remain hypotheses: a 30 m cell does not guarantee an exact boundary. Preparing a new window requires Earthdata on the server; the saved walkthrough already includes its data.',
  'method.s8.expanded': 'An extension to three area/date combinations, HH/HV and thresholds of 2, 3 and 4 dB also retains unfavorable results. In another 10 km window, HH correlation is 0.471 at the smoothed scale, with no joint detections at 3 dB (2 preview detections and 41 calibrated detections). Consecutive passes have few strong changes and some ratios cannot be calculated. All three cases are in La Mojana: this is not independent geographic validation.',
  'method.s8.title':
    'How close the overview is to the calibrated data',
  'method.s8.text':
    'November 14, 2026 audit: one 15 km window in La Mojana, June 26 to October 24, with 7,744 common pixels. Against GCOV aggregated to about 170 m: correlation 0.517, median absolute error 0.78 dB, precision 50.0% and recall 12.2% at the 3 dB HH threshold. With an additional 5×5 average (about 1 km): correlation 0.861, error 0.69 dB, precision 12.5% and recall 45.0%. At this latter scale, 9 of 72 browse detections and 20 reference detections overlap; 100% correct sign applies only to those 9 joint hits. Spatial correlation does not measure detection accuracy. Smoothed pixels are not independent observations. This window does not validate other areas, HV or physical classes; calibrated GCOV is not ground truth.',
  'method.s9.title':
    'The preview stretch is confirmed',
  'method.s9.text':
    'The quality-control metadata of each product confirms how the preview is made: clipping between the 5th and 95th percentiles, gamma of 0.5 and linear units. That metadata cannot be used to calibrate the image (its histogram is of the unaveraged data), so real calibration only comes from the lens.',
  'method.s10.title':
    'The optical map of the day',
  'method.s10.text':
    'It is the daily true-color image from the VIIRS satellite (NASA GIBS) on the “after” date. It shows what an optical satellite sees: often, clouds. NISAR’s radar sees the same area through them, which is why it is worth looking at both together.',
  'ctx.button':
    'Context',
  'ctx.title':
    'Context layers',
  'ctx.intro':
    'NASA layers to see what surrounds the change: where there is water, what covers the land and how many people live there. They sit beneath the NISAR change.',
  'ctx.agua.name':
    'Water seen by Sentinel-1',
  'ctx.agua.what':
    'It marks open water and inundated vegetation. It plays two roles: an independent check (another satellite, another day) and another frequency (C-band, versus NISAR’s L-band). If they agree, the clue holds up better; if not, the cause may be the frequency or the day.',
  'ctx.suelo.name':
    'Land cover (MODIS, 2024)',
  'ctx.suelo.what':
    'What is on the ground: forest, cropland, wetland or city. It helps read the change, because the same signal means different things over a crop and over a forest.',
  'ctx.poblacion.name':
    'Population density (2020)',
  'ctx.poblacion.what':
    'How many people live in each area: it shows who a change, such as a flood, may affect.',
  'ctx.opacity':
    'Opacity',
  'ctx.opacityOf':
    'Layer opacity: {name}',
  'ctx.legend':
    'How to read the colors',
  'ctx.poblacion.read':
    'From cream (under 1 person per km²) to dark red (1,000 or more). No color: no data, as over the ocean.',
  'ctx.link':
    'See the layer in NASA Worldview',
  'ctx.s1.group':
    'Sentinel-1 date',
  'ctx.s1.prev':
    'One day earlier',
  'ctx.s1.next':
    'One day later',
  'ctx.s1.same':
    'Same as the comparison’s “after” date',
  'ctx.s1.later':
    '{n} {unit} after the “after” date',
  'ctx.s1.earlier':
    '{n} {unit} before the “after” date',
  'ctx.day':
    'day',
  'ctx.days':
    'days',
  'ctx.s1.reset':
    'Back to the “after” date',
  'ctx.s1.note':
    'Sentinel-1 is another radar, in C-band; it passes every 6 to 12 days. If the map comes out empty, step a day forward or back until you hit a pass.',
  'ctx.attr.agua':
    'OPERA with Sentinel-1',
  'ctx.attr.suelo':
    'MODIS',
  'ctx.attr.poblacion':
    'GPW v4',
  'ctx.attr.pie':
    'Context: NASA GIBS, {names}.',
  'ctx.attr.full':
    'Attribution: NASA EOSDIS GIBS; OPERA (JPL); MODIS (NASA LP DAAC); GPW v4 (NASA SEDAC, CIESIN).',
  'classes.hint':
    'Pick a class to see why it may have changed.',
  'why.signal':
    'What the signal does',
  'why.mechanism':
    'Most likely mechanism',
  'why.lead':
    'Most likely cause',
  'why.others':
    'It could also be',
  'why.pol':
    'Which polarization reveals it',
  'pol.title':
    'What each polarization sees',
  'pol.single':
    'This comparison has a single polarization (HH): there is no HV reading.',
  'tabs.label':
    'Reading sections',
  'tabs.reading':
    'Reading',
  'tabs.point':
    'Point',
  'tabs.data':
    'Data',
  'story.future':
    'What comes next with NISAR',
  'story.futureLead':
    'This story is one part of what NISAR can do.',
  'future.title':
    'What comes next with NISAR',
  'future.intro':
    'What SARitmo shows today is one part of what NISAR can offer. This is what we already know about the satellite and what opens up from there.',
  'future.facts.title':
    'What is already a fact',
  'future.facts.1':
    'NISAR carries two radars: L-band (NASA) and S-band (ISRO).',
  'future.facts.2':
    'It revisits the same place every 12 days and observes on both ascending and descending orbits.',
  'future.facts.3':
    'L-band passes through foliage.',
  'future.facts.4':
    'Besides what SARitmo uses, the public catalog already publishes soil-moisture products, displacement products (useful for glaciers) and interferograms, plus an urgent-response line in near real time.',
  'future.apps.title':
    'Applications this opens up',
  'future.apps.1':
    'Tracking wetlands and floods under clouds and under forest.',
  'future.apps.2':
    'Crop calendars and crop area.',
  'future.apps.3':
    'Deforestation alerts.',
  'future.apps.4':
    'Meltwater and glacier movement.',
  'future.apps.5':
    'Ground deformation from earthquakes, volcanoes and subsidence.',
  'future.apps.6':
    'Support for disaster response.',
  'future.gap.title':
    'What SARitmo still needs to get there',
  'future.gap.1':
    'Complete, calibrated series: today the overview uses preview images with approximate dB, and the calibrated magnifier covers only small windows.',
  'future.gap.2':
    'Validation with field data: SARitmo does not yet check its signals against measurements taken on the ground.',
  'live.clusterHint':
    'Numbered circles group nearby events; select one to zoom in and split it apart.',
  'ref.group':
    'Map reference',
  'ref.borders':
    'Borders',
  'ref.names':
    'Names',
  'ref.bordersHint':
    'Show or hide country borders and state or province boundaries',
  'ref.namesHint':
    'Show or hide the names of countries, regions and cities',
  'ref.attribution':
    'Borders and names: Natural Earth.',
  'score.soundOn':
    'Note sound: on',
  'score.soundOff':
    'Note sound: off',
  'help.open':
    'How to use SARitmo and keyboard shortcuts',
  'help.title':
    'How to use SARitmo',
  'help.step.1':
    'Pick a story on the cover, or open Explore and click any place on the map.',
  'help.step.2':
    'On the score at the bottom, each note is one radar pass. Pick the “before” note and the “after” note, then press “Compare these dates”.',
  'help.step.3':
    'Click a point on the map to measure how much it changed there, switch layers on the map bar, and press “Watch the dance” to hear and see the whole series.',
  'help.keys':
    'Keyboard shortcuts',
  'help.keysNote':
    'Shortcuts are off while you type in a field. On the score, the arrow keys move between notes and Enter picks one.',
  'help.space':
    'Space',
  'help.key.stories':
    'Go to Stories',
  'help.key.explore':
    'Go to Explore',
  'help.key.live':
    'Go to Live',
  'help.key.prev':
    'Previous step of the story',
  'help.key.next':
    'Next step of the story',
  'help.key.dance':
    'Start or leave the dance',
  'help.key.playPause':
    'Pause or resume the dance',
  'help.key.sound':
    'Turn the note sound on or off',
  'help.key.borders':
    'Show or hide borders',
  'help.key.names':
    'Show or hide names',
  'help.key.zoomIn':
    'Zoom in',
  'help.key.zoomOut':
    'Zoom out',
  'help.key.recenter':
    'Back to the area',
  'help.key.help':
    'Open this help',
  'help.prefs':
    'Preferences',
  'help.pref.borders':
    'Borders and internal boundaries on the map',
  'help.pref.names':
    'Names of countries, regions and cities',
  'help.pref.sound':
    'Sound of the notes on the score',
  'help.pref.hints':
    'Hints on the map',
  'hint.dismiss':
    'Hide hints',
  'hint.pickPlace':
    'Click any place on the map, or search for it by name in the panel.',
  'hint.pickStack':
    'In the panel, choose one of the stacks of passes that cover this point.',
  'hint.pickNotes':
    'On the score below, pick the “before” note and the “after” note.',
  'hint.probe':
    'Click the map to measure how much a point changed.',
  'hint.interferogram':
    'Follow the steps in the panel to read the interferogram.',
  'hint.dance':
    'Each pass plays its note: the higher the pitch, the more radar return.',
  'hint.live':
    'Click a point on the map or a row in the list to see the event.',
  'hint.keys.steps':
    '← and → change steps.',
  'hint.keys.dance':
    'Space pauses it.',
  'live.updated':
    'Updated at {time}.',
  'live.stale':
    'The service did not respond: showing the last copy received.',
  'live.refresh':
    'Refresh',
  'live.refreshing':
    'Refreshing…',
  'live.onlyOpen':
    'Ongoing only',
  'live.onlyOpenHint':
    'Hides the events NASA has already closed',
  'live.events.noneOpen':
    'There are no ongoing events in the visible categories right now.',
  'hint.liveUrgent':
    'Click a violet footprint or a row in the list to see that acquisition.',
  'hint.liveSelected':
    'The gold button in the panel takes you to the NISAR passes over this point.',
  'ctx.agua.short':
    'Water',
  'ctx.suelo.short':
    'Forests and land',
  'ctx.poblacion.short':
    'Population',
  'ctx.settings':
    'Adjust the context layers: opacity, date and explanation',
  'ctx.close':
    'Close the context settings',
  'ctx.s1.on':
    'Sentinel-1, {date}',
  'ctx.poblacion.low':
    'fewer than 1',
  'ctx.poblacion.high':
    '1,000 or more people per km²',
  'hint.liveSatellite':
    'The model is NISAR at this instant; the gold band, what its radar can see; the dashed line, its next lap.',
  'live.tab.satellite':
    'NISAR now',
  'sat.marker':
    'NISAR drawn to scale, at its position right now',
  'sat.loading':
    'Fetching the NISAR orbit…',
  'sat.error':
    'Could not get the NISAR orbit. Check your connection and try again.',
  'sat.over':
    'Right now NISAR is flying over',
  'sat.north': 'N',
  'sat.south': 'S',
  'sat.east': 'E',
  'sat.west': 'W',
  'sat.altitude':
    'Altitude',
  'sat.speed':
    'Speed',
  'sat.speedValue':
    '{kms} mi/s ({kmh} mph)',
  'sat.heading':
    'Heading',
  'sat.ascending':
    'Northbound',
  'sat.descending':
    'Southbound',
  'sat.period':
    'One orbit every',
  'sat.periodValue':
    '{min} minutes',
  'sat.time':
    'Universal time',
  'sat.focus':
    'Center the map on NISAR',
  'sat.track':
    'The dotted gold line is the path of its next orbit; the pale one, the last {minutes} minutes. NISAR passes over the same place again every 12 days: that is the rhythm behind SARitmo and the beat of its score.',
  'sat.source':
    'Position computed with the SGP4 orbital model from the elements CelesTrak published {age}. It is an estimate within a few miles, not mission telemetry.',
  'sat.ageHours':
    '{n} h ago',
  'sat.ageDays':
    '{n} days ago',
  'sat.old':
    'The orbital elements are more than a week old or could not be refreshed: the position may be off.',
  'sat.scaleUp':
    'enlarged {n} times',
  'sat.scaleReal':
    'at true size',
  'sat.swath':
    'The gold band is the ground its radar can see: about 150 miles wide, to the left of its heading and at true scale on the map. It is what the radar can observe, not confirmation that it is recording.',
  'sat.model':
    'The satellite on the map is the 3D model of NISAR, to scale. It is 39 feet across, so it appears enlarged; the label says by how much.',
  'sat.tour':
    'See how NISAR works',
  'tour.open':
    'Guided tour',
  'tour.short':
    'Tour',
  'tour.label':
    'SARitmo guided tour',
  'tour.chapters':
    'Tour chapters',
  'tour.chapter.satellite':
    'The satellite',
  'tour.chapter.app':
    'The app',
  'tour.controls':
    'Tour controls',
  'tour.stepOf':
    'Step {n} of {total}',
  'tour.play':
    'Resume the tour',
  'tour.pause':
    'Pause the tour',
  'tour.prev':
    'Previous step',
  'tour.next':
    'Next step',
  'tour.close':
    'Close the tour',
  'tour.restart':
    'Replay',
  'tour.finish':
    'Start using SARitmo',
  'tour.figure':
    '3D model of NISAR; drag to turn it',
  'tour.figureDimensions':
    '3D model of NISAR with its measurements: 39-foot reflector, 30-foot boom, 18-foot-long body and 18-foot solar wings, next to a person 5 feet 9 inches tall',
  'tour.figureNote':
    'Built from the views and measurements published by NASA/JPL. Drag to turn it.',
  'tour.dim.reflector':
    '39 ft',
  'tour.dim.boom':
    '30 ft',
  'tour.dim.body':
    '18 ft',
  'tour.dim.solar':
    '18 ft',
  'tour.dim.person':
    '5 ft 9 in',
  'cover.tour':
    'Watch the guided tour',
  'cover.tourHelp':
    'About eight minutes in four chapters, and it plays by itself: the satellite part by part, how the radar works, how to read the data and how to use SARitmo.',
  'help.tour':
    'Watch the guided tour',
  'tour.now.title':
    'This is NISAR, right now',
  'tour.now.text':
    'NISAR is a radar satellite from NASA and ISRO, India’s space agency. It launched on July 30, 2025 and circles Earth every 100 minutes, 464 miles up. On the map it moves in real time, using the orbit published by CelesTrak.',
  'tour.scale.title':
    'Its real measurements',
  'tour.scale.text':
    'The model follows the views of the spacecraft that NASA publishes. The reflector is 39 feet across, wider than a tennis court, and the body is 18 feet long. At that size it would not fill a single pixel of the map, so there it appears enlarged, and its label says by how much.',
  'tour.reflector.title':
    'The reflector',
  'tour.reflector.text':
    'A gold-plated wire mesh stretched inside a ring of 123 struts, 39 feet across. It is a mirror for microwaves: it focuses the radar’s pulse toward Earth and gathers the echo that returns. It weighs only 142 pounds; it traveled folded and opened in orbit.',
  'tour.boom.title':
    'The boom',
  'tour.boom.text':
    'Thirty feet long, in two hinged sections. It holds the reflector by its rim, at just the distance and tilt for the radar to light it from below and for the beam to come down sideways toward Earth. It also traveled folded against the body.',
  'tour.radar.title':
    'Two radars in one',
  'tour.radar.text':
    'The eight-sided structure carries two radars that point up at the reflector. NASA’s L-band radar (the dark tiles) uses waves about 9 inches long that pass through foliage and reach the ground. ISRO’s S-band radar (the gold tiles) uses waves under 4 inches long, more sensitive to crops and low vegetation.',
  'tour.solar.title':
    'The solar wings',
  'tour.solar.text':
    'Two 18-foot wings, three panels each, deliver about 5 kilowatts. NISAR flies along the line between day and night, so it almost never enters Earth’s shadow and has sunlight for the radar nearly all the time.',
  'tour.bus.title':
    'The bus',
  'tour.bus.text':
    'This is the gold box built by ISRO. It carries the computers, the battery, the propellant and the reaction wheels that keep the radar pointed; the two tubes on top are star sensors, which it uses to find its orientation. The whole satellite weighed about 5,250 pounds at launch.',
  'tour.antenna.title':
    'The data antenna',
  'tour.antenna.text':
    'The radar produces a huge amount of information: up to 26 terabits per day. This Ka-band antenna, on the side facing Earth, sends it to ground stations. That is where the open NISAR products that SARitmo queries come from.',
  'tour.orbit.title':
    'One lap every 100 minutes',
  'tour.orbit.text':
    'The dashed line on the map is its next lap. NISAR passes near both poles while Earth turns beneath it, so each lap covers a different strip. After 173 laps, every 12 days, it repeats exactly the same path. That rhythm (ritmo, in Spanish) gives SARitmo its name.',
  'tour.swath.title':
    'It looks sideways',
  'tour.swath.text':
    'A radar does not look straight down: it looks sideways, to tell near from far by how long the echo takes. NISAR lights a strip about 150 miles wide to the left of its heading. That is the gold band on the map, at true scale: what it can observe, not confirmation that it is recording.',
  'tour.echo.title':
    'It sends and listens',
  'tour.echo.text':
    'NISAR does not take photos. It sends more than a thousand microwave pulses per second and measures two things about each echo: how long it takes to return, which tells where things are, and how strong it is, which tells what the surface is like. Because it carries its own light, it sees at night and through clouds.',
  'tour.story.title':
    'A real case',
  'tour.story.text':
    'Let’s read a real case. The left panel tells the story in steps: each step moves the map and changes what it shows. Everything that follows works the same in any story and in any place you explore.',
  'tour.reading.title':
    'The reading',
  'tour.reading.text':
    'The right panel says it in words: how much area changed, with which signals, and how well the two images could be compared. Every signal says “possible” because radar measures the echo, not the cause: these are clues to go and check, not confirmed events. Provenance and limits are in the Data tab.',
  'tour.probe.title':
    'Measure a point',
  'tour.probe.text':
    'A click on the map measures that point in decibels (dB), the unit of the echo: more negative values are darker surfaces. You see HH and HV before and after, and the difference. The tour has just measured one for you; the result is in the Point tab.',
  'tour.score.title':
    'The score',
  'tour.score.text':
    'Below, time is a musical staff. Each note is a NISAR pass over this place and each bar line marks 12 days. Pick one note for “before”, another for “after”, and press “Compare these dates”.',
  'tour.dance.title':
    'The dance',
  'tour.dance.text':
    '“Watch the dance” plays every pass in order and makes them sound: more return, higher note. It helps you see when a change began and how it went on.',
  'tour.explore.title':
    'Explore',
  'tour.explore.text':
    'Here you choose. Search for a place or click any point on the map, and SARitmo lists the NISAR passes that cover it. With two dates picked you get the same reading as in the stories.',
  'tour.live.title':
    'Live',
  'tour.live.text':
    'The natural events NASA is tracking right now: wildfires, storms, volcanoes. From any of them you can jump to Explore and see what NISAR captured before and after. Urgent acquisitions and the satellite in real time are here too.',
  'tour.end.title':
    'Your turn',
  'tour.end.text':
    'You now know the satellite, the radar and how to read its data. Pick a story, explore your own region or follow NISAR live. The tour stays in the top bar if you want to watch it again.',
  'unit.km':
    'mi',
  'tour.chapter.radar':
    'The radar',
  'tour.chapter.data':
    'The data',
  'tour.d.aria.orbit':
    'Diagram: NISAR circles from pole to pole while Earth turns beneath it',
  'tour.d.aria.look':
    'Diagram: the radar lights a strip to one side of the satellite, not beneath it',
  'tour.d.aria.echo':
    'Diagram: the pulse goes down, the echo returns, and near things arrive before far ones',
  'tour.d.aria.surfaces':
    'Diagram: how much echo still water, rough ground, forest and buildings return',
  'tour.d.aria.polarization':
    'Diagram: in HH the wave returns horizontal as it left; in HV it returns turned to vertical after bouncing in vegetation',
  'tour.d.aria.repeat':
    'Diagram: two passes over the same place are subtracted, leaving the change',
  'tour.d.earthTurns':
    'Earth turns',
  'tour.d.lap':
    'one lap: 100 min',
  'tour.d.repeat':
    'every 12 days it repeats its path',
  'tour.d.fromBehind':
    'seen from behind',
  'tour.d.altitude':
    '464 mi',
  'tour.d.swath':
    'about 150 mi',
  'tour.d.near':
    'near',
  'tour.d.far':
    'far',
  'tour.d.angles':
    '33° to 47°',
  'tour.d.pulse':
    'pulse',
  'tour.d.echo':
    'echo',
  'tour.d.time':
    'time',
  'tour.d.nearFirst':
    'near things arrive first',
  'tour.d.water':
    'still water',
  'tour.d.soil':
    'ground',
  'tour.d.forest':
    'forest',
  'tour.d.city':
    'buildings',
  'tour.d.inImage':
    'how each one looks in the image',
  'tour.d.sends':
    'sends H',
  'tour.d.hhBack':
    'returns the same: ground, water, buildings',
  'tour.d.hvBack':
    'returns rotated: vegetation',
  'tour.d.day0':
    'day 0',
  'tour.d.day12':
    'day 12',
  'tour.d.change':
    'change',
  'tour.d.less':
    'less echo',
  'tour.d.more':
    'more echo',
  'tour.surfaces.title':
    'What looks bright and what looks dark',
  'tour.surfaces.text':
    'Still water is a mirror: it sends the pulse away and almost nothing returns, so it looks dark. Rough ground returns part of it. Forest returns more, because the wave bounces among branches and trunks. And buildings, or trunks standing in water, return nearly all of it: a double bounce, very bright.',
  'tour.polarization.title':
    'HH and HV',
  'tour.polarization.text':
    'The radar wave vibrates in one direction. NISAR sends it horizontal (H) and listens to the echo in two ways. HH: it returns horizontal, as it left; this dominates over ground, water and buildings. HV: it returns turned to vertical, which only happens after bouncing many times inside vegetation. In practice, HV measures how much vegetation there is.',
  'tour.repeat.title':
    'Two passes, one change',
  'tour.repeat.text':
    'Because NISAR returns every 12 days along the same path and at the same angle, two images of one place can be compared point by point. If the echo dropped or rose, something changed on the surface: water that arrived or left, vegetation that grew or was lost. Everything SARitmo shows comes from that comparison.',
  'tour.images.title':
    'Before and After',
  'tour.images.text':
    'Each image is one radar pass, as NASA publishes it. Brightness is the strength of the echo. Color mixes the two channels: purple where HH dominates (ground, shorelines, buildings) and green where HV dominates (vegetation). Black is still water or a very smooth surface.',
  'tour.swipe.title':
    'The curtain',
  'tour.swipe.text':
    'The curtain puts the two dates side by side: before on the left, after on the right. Drag it across an area and you will see dark patches appear or vanish. It is the most direct way to check with your own eyes a change the map points to.',
  'tour.hh.title':
    'HH change',
  'tour.hh.text':
    'Now you no longer see images but the difference between the two dates in the HH channel. Blue: the echo dropped. Red: it rose. The stronger the color, the bigger the change; from 3 dB up, which means half or double the echo, it counts as a change. Strong blue on open land is often new water.',
  'tour.hv.title':
    'HV change',
  'tour.hv.text':
    'The same difference in the HV channel, the one that responds to vegetation. Blue: there is less plant structure than before, as after a harvest, logging, a fire, or a flood that covered the plants. Red: there is more, like a crop that grew. Comparing HH with HV is what lets you tell water from vegetation.',
  'tour.classes.title':
    'Signals',
  'tour.classes.text':
    'This layer combines both channels and paints seven possible signals. For example: if HH drops until the surface turns dark, possible new water; if HH rises while HV holds steady, possible flooded vegetation; if HV drops, possible vegetation loss. The colors match the list in the right panel, which works as the legend.',
  'tour.composite.title':
    'Composite',
  'tour.composite.text':
    'Both dates in a single image: the before in cyan and the after in red. Where nothing changed the colors add up to gray. Red: there is more echo now. Cyan: there was more echo before. It lets you see the change at a glance without losing sight of the terrain.',
  'tour.ctxWater.title':
    'Context: water',
  'tour.ctxWater.text':
    'Three NASA layers help you understand what surrounds a change. The first is water as seen by another radar, Sentinel-1: blue for open water, green for flooded vegetation. It is an independent check: another satellite, another day, another frequency. If it agrees with NISAR, the clue holds up better.',
  'tour.ctxLand.title':
    'Context: forests and land',
  'tour.ctxLand.text':
    'Land cover from MODIS: greens for forests, yellows for croplands and savannas, blue for wetlands and red for cities. It matters because the same signal means different things on different terrain: a drop in HV is a harvest in a crop field and logging in a forest.',
  'tour.ctxPeople.title':
    'Context: population',
  'tour.ctxPeople.text':
    'How many people live in each area, from cream (almost no one) to dark red (densely populated). It shows who a change may affect. All three layers switch on with the “Context” buttons above the map bar, and they sit beneath the NISAR data.',
};
