"""One immutable voice/persona per cast ID, across all published sentence chapters."""
def validate_voice_identity(documents, cast):
 identities={}
 for doc in documents:
  for segment in doc['sentences']:
   cid=segment['cast_id'];profile=cast['profiles'].get(cid)
   if not profile:raise ValueError('Unmapped cast: '+cid)
   actual=(segment['voice'],segment['performance']['character_persona'])
   expected=(profile['voice_name'],profile['persona'])
   if actual!=expected:raise ValueError('Voice/persona identity changed: '+segment['sentence_id'])
   if cid in identities and identities[cid]!=actual:raise ValueError('Multiple identities for cast: '+cid)
   identities[cid]=actual
 return {cid:dict(voice=value[0],persona=value[1]) for cid,value in identities.items()}
