-- Paket TOEFL Model A: 50 Listening, 40 Structure/Written Expression, 50 Reading.
-- Jalankan setelah add-question-packages.sql. Aman dijalankan ulang.

begin;

delete from public.soal where package_code = 'model_a';

insert into public.soal (
  package_code, section, nomor_soal, part, audio_url,
  passage_title, passage_text, pertanyaan,
  pilihan_a, pilihan_b, pilihan_c, pilihan_d, kunci_jawaban
)
values
  ('model_a', 'listening', '1', 'Part A', '/audio/model-a/listening/no-1.mp3', null, null, 'Choose the best answer.', 'He makes a lot of money.', 'He has just been left some money.', 'He doesn''t believe three hundred dollars is enough.', 'He can''t afford to spend that much.', 'D'),
  ('model_a', 'listening', '2', 'Part A', '/audio/model-a/listening/no-2.mp3', null, null, 'Choose the best answer.', 'He knows what is wrong with the watch.', 'The woman doesn''t need to buy another battery.', 'The woman should get a new watch.', 'The jewelry store can probably repair the woman''s watch.', 'D'),
  ('model_a', 'listening', '3', 'Part A', '/audio/model-a/listening/no-3.mp3', null, null, 'Choose the best answer.', 'He has another meeting to attend on that day.', 'He''s available either day.', 'He can''t attend a two-day conference.', 'Not everybody will go to the same meeting.', 'B'),
  ('model_a', 'listening', '4', 'Part A', '/audio/model-a/listening/no-4.mp3', null, null, 'Choose the best answer.', 'Go to the beach with her friends.', 'Postpone her meeting with Professor Jones.', 'See Professor Jones after class.', 'Give a speech in Professor Jones''s class.', 'C'),
  ('model_a', 'listening', '5', 'Part A', '/audio/model-a/listening/no-5.mp3', null, null, 'Choose the best answer.', 'She isn''t a very good student.', 'She hasn''t gotten her grades yet.', 'She shouldn''t worry about her grades.', 'She doesn''t like to talk about grades.', 'C'),
  ('model_a', 'listening', '6', 'Part A', '/audio/model-a/listening/no-6.mp3', null, null, 'Choose the best answer.', 'The classes have improved his health.', 'His new glasses fit better than the old ones.', 'He''s thinking of taking exercise classes.', 'He''s unhappy about his life.', 'A'),
  ('model_a', 'listening', '7', 'Part A', '/audio/model-a/listening/no-7.mp3', null, null, 'Choose the best answer.', 'She also found the book difficult.', 'She has learned a lot about names.', 'She doesn''t remember the title of the novel.', 'She read a different book.', 'A'),
  ('model_a', 'listening', '8', 'Part A', '/audio/model-a/listening/no-8.mp3', null, null, 'Choose the best answer.', 'They''ll have to go to a later show.', 'The people in line all have tickets.', 'She doesn''t want to go to the second show.', 'They won''t have to wait much longer.', 'A'),
  ('model_a', 'listening', '9', 'Part A', '/audio/model-a/listening/no-9.mp3', null, null, 'Choose the best answer.', 'If it''s too late for her to drop the course.', 'If she sympathizes with him.', 'If she apologized for what she did.', 'If she regrets taking the course.', 'D'),
  ('model_a', 'listening', '10', 'Part A', '/audio/model-a/listening/no-10.mp3', null, null, 'Choose the best answer.', 'She''ll be traveling during winter break.', 'She''ll be working during vacation.', 'She''s looking forward to going home.', 'She wants to hire another research assistant.', 'B'),
  ('model_a', 'listening', '11', 'Part A', '/audio/model-a/listening/no-11.mp3', null, null, 'Choose the best answer.', 'He''s glad he called the doctor.', 'He wants to change the appointment.', 'He can''t come until 4:15.', 'He was confused about the date of the appointment.', 'D'),
  ('model_a', 'listening', '12', 'Part A', '/audio/model-a/listening/no-12.mp3', null, null, 'Choose the best answer.', 'No one believes he won the scholarship.', 'He''s surprised that he got the scholarship.', 'It isn''t true that he won the scholarship.', 'He''s glad to award the woman the scholarship.', 'B'),
  ('model_a', 'listening', '13', 'Part A', '/audio/model-a/listening/no-13.mp3', null, null, 'Choose the best answer.', 'During economics class.', 'Before economics.', 'In about an hour.', 'The next day.', 'D'),
  ('model_a', 'listening', '14', 'Part A', '/audio/model-a/listening/no-14.mp3', null, null, 'Choose the best answer.', 'The nurse wasn''t able to help her.', 'She''s going to help the nurse as soon as she feels better.', 'She thinks she should ask the nurse for a pill.', 'She feels sleepy because of the medicine she took.', 'D'),
  ('model_a', 'listening', '15', 'Part A', '/audio/model-a/listening/no-15.mp3', null, null, 'Choose the best answer.', 'Whether she can make a proposal.', 'Whether Bill needs her help.', 'Whether she can review Bill''s summary.', 'Whether she can speak for Bill.', 'C'),
  ('model_a', 'listening', '16', 'Part A', '/audio/model-a/listening/no-16.mp3', null, null, 'Choose the best answer.', 'He can''t wear the shirt right now.', 'He can''t find the shirt.', 'He doesn''t like the shirt.', 'He thinks the shirt is inappropriate for the occasion.', 'A'),
  ('model_a', 'listening', '17', 'Part A', '/audio/model-a/listening/no-17.mp3', null, null, 'Choose the best answer.', 'He has three classes in a row.', 'His class begins at one o''clock.', 'His class meets for three hours.', 'He will be in class all afternoon.', 'C'),
  ('model_a', 'listening', '18', 'Part A', '/audio/model-a/listening/no-18.mp3', null, null, 'Choose the best answer.', 'The team won despite poor play.', 'The team has to play at least one game.', 'At least the football team played well.', 'The team should have won the game.', 'A'),
  ('model_a', 'listening', '19', 'Part A', '/audio/model-a/listening/no-19.mp3', null, null, 'Choose the best answer.', 'She needed warmer clothing than in previous summers.', 'She knitted two sweaters in August.', 'August was warmer than the rest of the summer.', 'She was unusually busy all summer.', 'A'),
  ('model_a', 'listening', '20', 'Part A', '/audio/model-a/listening/no-20.mp3', null, null, 'Choose the best answer.', 'If the man is going to the store.', 'How the man feels about the news.', 'If the man is going to lose his job.', 'Where the man heard the news.', 'C'),
  ('model_a', 'listening', '21', 'Part A', '/audio/model-a/listening/no-21.mp3', null, null, 'Choose the best answer.', 'It will be ready at four o''clock today.', 'It can be picked up at two o''clock tomorrow.', 'It will be ready in two hours.', 'Only two rolls will be ready on time.', 'B'),
  ('model_a', 'listening', '22', 'Part A', '/audio/model-a/listening/no-22.mp3', null, null, 'Choose the best answer.', 'He''ll go to the party with the woman.', 'He met the man at the party.', 'He has changed his plans.', 'He has to work late.', 'C'),
  ('model_a', 'listening', '23', 'Part A', '/audio/model-a/listening/no-23.mp3', null, null, 'Choose the best answer.', 'Pay for some of the food.', 'Insist on choosing their own food.', 'Treat Gary to dinner some other time.', 'Thank Gary for his generous offer.', 'A'),
  ('model_a', 'listening', '24', 'Part A', '/audio/model-a/listening/no-24.mp3', null, null, 'Choose the best answer.', 'She used to work at a newspaper.', 'She''d like her supervisor''s opinion of her work.', 'She wishes she had a different kind of job.', 'She meets with her supervisor regularly.', 'B'),
  ('model_a', 'listening', '25', 'Part A', '/audio/model-a/listening/no-25.mp3', null, null, 'Choose the best answer.', 'She rearranged the chapters of her book.', 'She assured him that the chapter was finished.', 'She worked on the chapter for quite a while.', 'She wasn''t sure how to end the book.', 'C'),
  ('model_a', 'listening', '26', 'Part A', '/audio/model-a/listening/no-26.mp3', null, null, 'Choose the best answer.', 'There''s room to stack up the cans of coffee.', 'The store is out of coffee.', 'They should buy a lot of coffee.', 'They should wait for a better deal on coffee.', 'C'),
  ('model_a', 'listening', '27', 'Part A', '/audio/model-a/listening/no-27.mp3', null, null, 'Choose the best answer.', 'She works very hard.', 'She is very strict.', 'Her classes fill up quickly.', 'It''s easy to get good grades in her courses.', 'B'),
  ('model_a', 'listening', '28', 'Part A', '/audio/model-a/listening/no-28.mp3', null, null, 'Choose the best answer.', 'The office already mailed the man''s birth certificate.', 'The office no longer issues birth certificates.', 'The man doesn''t have sufficient identification for his request.', 'The man will have to apply for his birth certificate in writing.', 'D'),
  ('model_a', 'listening', '29', 'Part A', '/audio/model-a/listening/no-29.mp3', null, null, 'Choose the best answer.', 'The woman has a choice of early flights.', 'Not many planes go to Washington.', 'The woman should take the earlier flight.', 'The six o''clock flight is already filled.', 'A'),
  ('model_a', 'listening', '30', 'Part A', '/audio/model-a/listening/no-30.mp3', null, null, 'Choose the best answer.', 'She would rather not invite other clubs to join them.', 'They should prepare extra refreshments.', 'The members of the club always eat a lot.', 'There was too much food at a previous meeting.', 'D'),
  ('model_a', 'listening', '31', 'Part B', '/audio/model-a/listening/no-31.mp3', null, null, 'Choose the best answer.', 'Get a ride home with Nancy.', 'Find a place to live.', 'Go to the store before it closes.', 'Carry his groceries home.', 'D'),
  ('model_a', 'listening', '32', 'Part B', '/audio/model-a/listening/no-32.mp3', null, null, 'Choose the best answer.', 'He didn''t expect to buy a lot.', 'He had only one bag of groceries.', 'The supermarket is just down the block.', 'He thought he''d get a ride with the Kramers.', 'A'),
  ('model_a', 'listening', '33', 'Part B', '/audio/model-a/listening/no-33.mp3', null, null, 'Choose the best answer.', 'They are paying for his education.', 'They invited him to their party.', 'They took him on a vacation with them.', 'They let him live with them for free.', 'D'),
  ('model_a', 'listening', '34', 'Part B', '/audio/model-a/listening/no-34.mp3', null, null, 'Choose the best answer.', 'She was impressed by it.', 'It was a waste of money.', 'She was amazed it had opened so soon.', 'She didn''t like it as much as the other wings.', 'A'),
  ('model_a', 'listening', '35', 'Part B', '/audio/model-a/listening/no-35.mp3', null, null, 'Choose the best answer.', 'He took a tour of the city.', 'He read about it.', 'He wrote an article about it.', 'He worked there as a guide.', 'B'),
  ('model_a', 'listening', '36', 'Part B', '/audio/model-a/listening/no-36.mp3', null, null, 'Choose the best answer.', 'They came from the original wing.', 'They''re made of the same material.', 'They''re similar in shape.', 'They were designed by the same person.', 'C'),
  ('model_a', 'listening', '37', 'Part B', '/audio/model-a/listening/no-37.mp3', null, null, 'Choose the best answer.', 'It was made of aluminum.', 'It wasn''t large enough.', 'It wouldn''t move in the wind.', 'It was too heavy to put up.', 'D'),
  ('model_a', 'listening', '38', 'Part C', '/audio/model-a/listening/no-38.mp3', null, null, 'Choose the best answer.', 'To review material that will be on a test.', 'To introduce a new professor.', 'To explain changes in the schedule.', 'To describe the contents of a paper.', 'C'),
  ('model_a', 'listening', '39', 'Part C', '/audio/model-a/listening/no-39.mp3', null, null, 'Choose the best answer.', 'At the beginning.', 'In the middle.', 'One week before the end.', 'At the end.', 'B'),
  ('model_a', 'listening', '40', 'Part C', '/audio/model-a/listening/no-40.mp3', null, null, 'Choose the best answer.', 'Administer an examination.', 'Present a conference paper.', 'Explain next week''s schedule.', 'Take attendance in class.', 'A'),
  ('model_a', 'listening', '41', 'Part C', '/audio/model-a/listening/no-41.mp3', null, null, 'Choose the best answer.', 'A regular class will be given.', 'An optional review class will be given.', 'An exam will be given.', 'Class will be canceled.', 'B'),
  ('model_a', 'listening', '42', 'Part C', '/audio/model-a/listening/no-42.mp3', null, null, 'Choose the best answer.', 'Rock formations in the Nevada desert.', 'Graduate studies in anthropology.', 'Excavation techniques used in archaeology.', 'Prehistoric desert people of Nevada.', 'D'),
  ('model_a', 'listening', '43', 'Part C', '/audio/model-a/listening/no-43.mp3', null, null, 'Choose the best answer.', 'They planned their migrations.', 'They didn''t travel far from their base camps.', 'They hid from their enemies in caves.', 'They planted seeds near their camps.', 'A'),
  ('model_a', 'listening', '44', 'Part C', '/audio/model-a/listening/no-44.mp3', null, null, 'Choose the best answer.', 'They had trouble finding it.', 'Lack of light made it impossible.', 'It was too small for a group to fit into.', 'Items stored by others took up most of the space.', 'B'),
  ('model_a', 'listening', '45', 'Part C', '/audio/model-a/listening/no-45.mp3', null, null, 'Choose the best answer.', 'Prehistoric desert people.', 'Migratory animals.', 'Food supplies and tools.', 'Growing plants.', 'C'),
  ('model_a', 'listening', '46', 'Part C', '/audio/model-a/listening/no-46.mp3', null, null, 'Choose the best answer.', 'To illustrate the size of some objects.', 'To introduce the next assignment.', 'To show some artifacts on display at the campus museum.', 'To demonstrate his photographic ability.', 'A'),
  ('model_a', 'listening', '47', 'Part C', '/audio/model-a/listening/no-47.mp3', null, null, 'Choose the best answer.', 'A comparison of fish to warm-blooded animals.', 'The difference between saltwater and freshwater environments.', 'The importance of fish to human beings.', 'How water has affected the development of fish.', 'D'),
  ('model_a', 'listening', '48', 'Part C', '/audio/model-a/listening/no-48.mp3', null, null, 'Choose the best answer.', 'It can''t be compressed.', 'It is often polluted.', 'Its temperature often fluctuates dramatically.', 'It limits their size.', 'A'),
  ('model_a', 'listening', '49', 'Part C', '/audio/model-a/listening/no-49.mp3', null, null, 'Choose the best answer.', 'A whale.', 'A human.', 'A snake.', 'A snail.', 'C'),
  ('model_a', 'listening', '50', 'Part C', '/audio/model-a/listening/no-50.mp3', null, null, 'Choose the best answer.', 'Its skeleton.', 'Its shape.', 'Its senses.', 'Its body temperature.', 'B');

insert into public.soal (
  package_code, section, nomor_soal, part, audio_url,
  passage_title, passage_text, pertanyaan,
  pilihan_a, pilihan_b, pilihan_c, pilihan_d, kunci_jawaban
)
values
  ('model_a', 'structure', '1', 'Structure', null, null, null, 'According to the third law of thermodynamics, ______ possible is -273.16 degrees centigrade.', 'that temperature is lowest', 'the temperature is lowest', 'lowest temperature', 'the lowest temperature', 'D'),
  ('model_a', 'structure', '2', 'Structure', null, null, null, 'After the First World War, the author Anaïs Nin became interested in the art movement known as Surrealism and in psychoanalysis, both ______ her novels and short stories.', 'in which the influence', 'of which influenced', 'to have influence', 'its influence in', 'B'),
  ('model_a', 'structure', '3', 'Structure', null, null, null, 'Muskrats generally ______ close to the edge of a bog, where their favorite plant foods grow plentifully.', 'staying', 'they are staying', 'stay', 'to stay there', 'C'),
  ('model_a', 'structure', '4', 'Structure', null, null, null, 'Oliver Ellsworth, ______ of the United States Supreme Court, was the author of the bill that established the federal court system.', 'he was the third chief justice', 'the third chief justice was', 'who the third chief justice', 'the third chief justice', 'D'),
  ('model_a', 'structure', '5', 'Structure', null, null, null, '______ Colonial period the great majority of Connecticut''s settlers came from England.', 'Since', 'The time', 'During the', 'It was', 'C'),
  ('model_a', 'structure', '6', 'Structure', null, null, null, 'A politician can make a legislative proposal more ______ by giving specific examples of what its effect will be.', 'to understanding', 'understandably', 'understandable', 'when understood', 'C'),
  ('model_a', 'structure', '7', 'Structure', null, null, null, 'Playing the trumpet with dazzling originality, ______ dominated jazz for 20 years.', 'Louis Armstrong', 'the influence of Louis Armstrong', 'the music of Louis Armstrong', 'Louis Armstrong''s talent', 'A'),
  ('model_a', 'structure', '8', 'Structure', null, null, null, 'Before every presidential election in the United States, the statisticians try to guess the proportion of the population that ______ for each candidate.', 'are voted', 'voting', 'to be voted', 'will vote', 'D'),
  ('model_a', 'structure', '9', 'Structure', null, null, null, '______ at a river ford on the Donner Pass route to California, the city of Reno grew as bridges and railroads were built.', 'Settle', 'To settle', 'It was settling', 'Having been settled', 'D'),
  ('model_a', 'structure', '10', 'Structure', null, null, null, 'The air inside a house or office building often has higher concentrations of contaminants ______ heavily polluted outside air.', 'than does', 'more', 'as some that are', 'like of', 'A'),
  ('model_a', 'structure', '11', 'Structure', null, null, null, 'The decimal numeral system is one of the ______ ways of expressing numbers.', 'useful most world''s', 'world''s most useful', 'useful world''s most', 'most world''s useful', 'B'),
  ('model_a', 'structure', '12', 'Structure', null, null, null, 'Emily Dickinson''s garden was a place ______ great inspiration for her poems.', 'that she drew', 'by drawing her', 'from which she drew', 'drawn from which', 'C'),
  ('model_a', 'structure', '13', 'Structure', null, null, null, 'The mountains surrounding Los Angeles effectively shield the city from the hot, dry winds of the Mojave Desert, ______ the circulation of air.', 'but they also prevent', 'also prevented by them', 'and also to prevent', 'and also preventing', 'A'),
  ('model_a', 'structure', '14', 'Structure', null, null, null, 'Not only ______ to determine the depth of the ocean floor, but it is also used to locate oil.', 'to use seismology', 'is seismology used', 'seismology is used', 'using seismology', 'B'),
  ('model_a', 'structure', '15', 'Structure', null, null, null, 'Nebraska has floods in some years, ______.', 'in others drought', 'droughts are others', 'while other droughts', 'others in drought', 'A'),
  ('model_a', 'structure', '16', 'Written Expression', null, null, null, 'Pop Art was a movement of the 1950''s and 1960''s whom imagery was based on readily recognized American products and people.', 'a movement', 'whom', 'based on', 'people', 'B'),
  ('model_a', 'structure', '17', 'Written Expression', null, null, null, 'Because the tachinid fly is a parasite of harmful insects, much species have been imported into the United States to combat insect pests.', 'harmful', 'much', 'have been imported', 'to combat', 'B'),
  ('model_a', 'structure', '18', 'Written Expression', null, null, null, 'All almost the electricity for industrial use comes from large generators driven by steam turbines.', 'All almost', 'industrial', 'use', 'driven by', 'A'),
  ('model_a', 'structure', '19', 'Written Expression', null, null, null, 'The Egyptians first discovered that drying fruit preserved it, made it sweeter, and improvement its flavor.', 'first', 'drying', 'sweeter', 'improvement', 'D'),
  ('model_a', 'structure', '20', 'Written Expression', null, null, null, 'During his twelve year there, Ellis Marsalis turned the New Orleans Center for the Creative Arts into a rich training place for future jazz stars.', 'twelve year there', 'turned', 'rich', 'future', 'A'),
  ('model_a', 'structure', '21', 'Written Expression', null, null, null, 'Algebra is the branch of mathematics concerned with operations on sets of numbers or other elements that are often represented at symbols.', 'branch', 'sets', 'elements', 'at', 'D'),
  ('model_a', 'structure', '22', 'Written Expression', null, null, null, 'As her focus changed, the love poetry that Edna St. Vincent Millay produced in the 1920''s increasing gave way to poetry dealing with social injustice.', 'As', 'changed', 'produced', 'increasing', 'D'),
  ('model_a', 'structure', '23', 'Written Expression', null, null, null, 'When a pearl is cut in half and examined under a microscope, but its layers can be seen.', 'is cut', 'a microscope', 'its', 'be seen', 'C'),
  ('model_a', 'structure', '24', 'Written Expression', null, null, null, 'A conductor uses signals and gestures to let the musicians to know when to play various parts of a composition.', 'signals', 'musicians', 'to know', 'to play', 'C'),
  ('model_a', 'structure', '25', 'Written Expression', null, null, null, 'If a glass lizard loses its tails, a new one grows to replace it.', 'If', 'tails', 'a new', 'to replace', 'B'),
  ('model_a', 'structure', '26', 'Written Expression', null, null, null, 'Many of the recording instruments used in vary branches of science are kymographs.', 'recording', 'in', 'vary', 'are', 'B'),
  ('model_a', 'structure', '27', 'Written Expression', null, null, null, 'It was near end of prehistoric times that the first wheeled vehicles appeared.', 'near end', 'prehistoric', 'first wheeled', 'appeared', 'A'),
  ('model_a', 'structure', '28', 'Written Expression', null, null, null, 'Martin Luther King, Jr.''s magnificent speaking ability enabling him to effectively express the demands for social justice for Black Americans.', 'speaking', 'enabling', 'effectively', 'for', 'B'),
  ('model_a', 'structure', '29', 'Written Expression', null, null, null, 'Designers of athletic footwear finely tune each category of shoe to its particularly activity by studying human motion and physiology.', 'athletic footwear', 'category', 'particularly', 'studying', 'C'),
  ('model_a', 'structure', '30', 'Written Expression', null, null, null, 'Gothic Revival architecture has several basis characteristics that distinguish it from other nineteenth-century architectural styles.', 'several', 'basis', 'distinguish', 'other', 'B'),
  ('model_a', 'structure', '31', 'Written Expression', null, null, null, 'Since rats are destructive and may carry disease, therefore many cities try to exterminate them.', 'destructive', 'may carry', 'therefore', 'exterminate', 'C'),
  ('model_a', 'structure', '32', 'Written Expression', null, null, null, 'In the United States among 60 percent of the space on the pages of newspapers is reserved for advertising.', 'among', 'of the space', 'is reserved', 'advertising', 'A'),
  ('model_a', 'structure', '33', 'Written Expression', null, null, null, 'Recently in the automobile industry, multinational companies have developed to the point where such few cars can be described as having been made entirely in one country.', 'have developed', 'such few', 'having been made', 'entirely', 'B'),
  ('model_a', 'structure', '34', 'Written Expression', null, null, null, 'Scientists believe that by altering the genetic composition of plants it is possible to develop specimens that are resisting to disease and have increased food value.', 'altering', 'resisting', 'disease', 'increased', 'B'),
  ('model_a', 'structure', '35', 'Written Expression', null, null, null, 'The purpose of traveler''s checks is to protect travelers from theft and accidental lost of money.', 'of', 'is', 'theft', 'lost', 'D'),
  ('model_a', 'structure', '36', 'Written Expression', null, null, null, 'The early periods of aviation in the United States was marked by exhibition flights made by individual fliers or by teams of performers at country fairs.', 'periods of aviation', 'exhibition flights', 'individual fliers', 'teams of performers', 'A'),
  ('model_a', 'structure', '37', 'Written Expression', null, null, null, 'The American anarchist Emma Goldman infused her spirited lectures, publishes, and demonstrations with a passionate belief in the freedom of the individual.', 'publishes', 'with a', 'belief', 'the', 'A'),
  ('model_a', 'structure', '38', 'Written Expression', null, null, null, 'Being the biggest expanse of brackish water in the world, the Baltic Sea is of special interesting to scientists.', 'Being the biggest', 'in the', 'is of', 'interesting', 'D'),
  ('model_a', 'structure', '39', 'Written Expression', null, null, null, 'The main advertising media include direct mail, radio, television, magazines, and newspaper.', 'The main', 'advertising', 'direct mail', 'newspaper', 'D'),
  ('model_a', 'structure', '40', 'Written Expression', null, null, null, 'While studying the chemistry of human body, Dr. Rosalyn Yalow won a Nobel Prize for the research she conducted on the role of hormones.', 'chemistry', 'of human body', 'conducted on', 'role of', 'B');

with passages(first_question, last_question, title, passage_text) as (
  values
    ('1', '9', 'The Ocean Bottom and the Glomar Challenger', 'The ocean bottom — a region nearly 2.5 times greater than the total land area of the
Earth — is a vast frontier that even today is largely unexplored and uncharted. Until
about a century ago, the deep-ocean floor was completely inaccessible, hidden beneath
waters averaging over 3,600 meters deep. Totally without light and subjected to intense
pressures hundreds of times greater than at the Earth''s surface, the deep-ocean bottom
is a hostile environment to humans, in some ways as forbidding and remote as the void
of outer space.
Although researchers have taken samples of deep-ocean rocks and sediments for
over a century, the first detailed global investigation of the ocean bottom did not
actually start until 1968, with the beginning of the National Science Foundation''s Deep
Sea Drilling Project (DSDP). Using techniques first developed for the offshore oil and
gas industry, the DSDP''s drill ship, the Glomar Challenger, was able to maintain a
steady position on the ocean''s surface and drill in very deep waters, extracting samples
of sediments and rock from the ocean floor.
The Glomar Challenger completed 96 voyages in a 15-year research program that
ended in November 1983. During this time, the vessel logged 600,000 kilometers and
took almost 20,000 core samples of seabed sediments and rocks at 624 drilling sites
around the world. The Glomar Challenger''s core samples have allowed geologists
to reconstruct what the planet looked like hundreds of millions of years ago and to
calculate what it will probably look like millions of years in the future. Today, largely
on the strength of evidence gathered during the Glomar Challenger''s voyages, nearly
all earth scientists agree on the theories of plate tectonics and continental drift that
explain many of the geological processes that shape the Earth.
The cores of sediment drilled by the Glomar Challenger have also yielded
information critical to understanding the world''s past climates. Deep-ocean sediments
provide a climatic record stretching back hundreds of millions of years, because they
are largely isolated from the mechanical erosion and the intense chemical and biological
activity that rapidly destroy much land-based evidence of past climates. This record has
already provided insights into the patterns and causes of past climatic change —
information that may be used to predict future climates.'),
    ('10', '21', 'Canada''s Postwar Population Growth', 'Basic to any understanding of Canada in the 20 years after the Second World War is
the country''s impressive population growth. For every three Canadians in 1945, there
were over five in 1966. In September 1966 Canada''s population passed the 20 million
mark. Most of this surging growth came from natural increase. The depression of the
1930''s and the war had held back marriages, and the catching-up process began after
1945. The baby boom continued through the decade of the 1950''s, producing a
population increase of nearly fifteen percent in the five years from 1951 to 1956. This
rate of increase had been exceeded only once before in Canada''s history, in the decade
before 1911, when the prairies were being settled. Undoubtedly, the good economic
conditions of the 1950''s supported a growth in the population, but the expansion also
derived from a trend toward earlier marriages and an increase in the average size of
families. In 1957 the Canadian birth rate stood at 28 per thousand, one of the highest in
the world.
After the peak year of 1957, the birth rate in Canada began to decline. It continued
falling until in 1966 it stood at the lowest level in 25 years. Partly this decline reflected
the low level of births during the depression and the war, but it was also caused by
changes in Canadian society. Young people were staying at school longer; more
women were working; young married couples were buying automobiles or houses
before starting families; rising living standards were cutting down the size of families.
It appeared that Canada was once more falling in step with the trend toward smaller
families that had occurred all through the Western world since the time of the Industrial
Revolution.
Although the growth in Canada''s population had slowed down by 1966 (the
increase in the first half of the 1960''s was only nine percent), another large population
wave was coming over the horizon. It would be composed of the children of the
children who were born during the period of the high birth rate prior to 1957.'),
    ('22', '30', 'Organically Grown Foods', 'Are organically grown foods the best food choices? The advantages claimed for
such foods over conventionally grown and marketed food products are now being
debated. Advocates of organic foods — a term whose meaning varies greatly —
frequently proclaim that such products are safer and more nutritious than others.
The growing interest of consumers in the safety and nutritional quality of the
typical North American diet is a welcome development. However, much of this
interest has been sparked by sweeping claims that the food supply is unsafe or
inadequate in meeting nutritional needs. Although most of these claims are not
supported by scientific evidence, the preponderance of written material advancing
such claims makes it difficult for the general public to separate fact from fiction.
As a result, claims that eating a diet consisting entirely of organically grown foods
prevents or cures disease or provides other benefits to health have become widely
publicized and form the basis for folklore.
Almost daily the public is besieged by claims for “no-aging” diets, new vitamins,
and other wonder foods. There are numerous unsubstantiated reports that natural
vitamins are superior to synthetic ones, that fertilized eggs are nutritionally superior
to unfertilized eggs, that untreated grains are better than fumigated grains, and the like.
One thing that most organically grown food products seem to have in common is
that they cost more than conventionally grown foods. But in many cases consumers are
misled if they believe organic foods can maintain health and provide better nutritional
quality than conventionally grown foods. So there is real cause for concern if consumers,
particularly those with limited incomes, distrust the regular food supply and buy only
expensive organic foods instead.'),
    ('31', '40', 'The Origins of Drama in Ancient Greece', 'There are many theories about the beginning of drama in ancient Greece. The one
most widely accepted today is based on the assumption that drama evolved from ritual.
The argument for this view goes as follows. In the beginning, human beings viewed
the natural forces of the world, even the seasonal changes, as unpredictable, and they
sought, through various means, to control these unknown and feared powers. Those
measures which appeared to bring the desired results were then retained and repeated
until they hardened into fixed rituals. Eventually stories arose which explained or
veiled the mysteries of the rites. As time passed some rituals were abandoned, but
the stories, later called myths, persisted and provided material for art and drama.
Those who believe that drama evolved out of ritual also argue that those rites
contained the seed of theater because music, dance, masks, and costumes were almost
always used. Furthermore, a suitable site had to be provided for performances, and
when the entire community did not participate, a clear division was usually made
between the “acting area” and the “auditorium.” In addition, there were performers,
and, since considerable importance was attached to avoiding mistakes in the enactment
of rites, religious leaders usually assumed that task. Wearing masks and costumes, they
often impersonated other people, animals, or supernatural beings, and mimed the desired
effect — success in hunt or battle, the coming rain, the revival of the Sun — as an actor
might. Eventually such dramatic representations were separated from religious
activities.
Another theory traces the theater''s origin from the human interest in storytelling.
According to this view, tales (about the hunt, war, or other feats) are gradually
elaborated, at first through the use of impersonation, action, and dialogue by a narrator
and then through the assumption of each of the roles by a different person. A closely
related theory traces theater to those dances that are primarily rhythmical and
gymnastic or that are imitations of animal movements and sounds.'),
    ('41', '50', 'Post-Civil War Reconstruction', 'Staggering tasks confronted the people of the United States, North and South, when
the Civil War ended. About a million and a half soldiers from both sides had to be
demobilized, readjusted to civilian life, and reabsorbed by the devastated economy.
Civil government also had to be put back on a peacetime basis and interference from
the military had to be stopped.
The desperate plight of the South has eclipsed the fact that reconstruction had to be
undertaken also in the North, though less spectacularly. Industries had to adjust to
peacetime conditions; factories had to be retooled for civilian needs.
Financial problems loomed large in both the North and the South. The national debt
had shot up from a modest $65 million in 1861, the year the war started, to nearly $3
billion in 1865, the year the war ended. This was a colossal sum for those days but one
that a prudent government could pay. At the same time, war taxes had to be reduced to
less burdensome levels.
Physical devastation caused by invading armies, chiefly in the South and border
states, had to be repaired. This herculean task was ultimately completed, but with
discouraging slowness.
Other important questions needed answering. What would be the future of the four
million Black people who were freed from slavery? On what basis were the Southern
states to be brought back into the Union?
What of the Southern leaders, all of whom were liable to charges of treason? One
of these leaders, Jefferson Davis, president of the Southern Confederacy, was the
subject of an insulting popular Northern song, “Hang Jeff Davis from a Sour Apple
Tree,” and even children sang it. Davis was temporarily chained in his prison cell
during the early days of his two-year imprisonment. But he and the other Southern
leaders were finally released, partly because it was unlikely that a jury from Virginia, a
Southern Confederate state, would convict them. All the leaders were finally pardoned
by President Johnson in 1868 in an effort to help reconstruction efforts proceed with as
little bitterness as possible.')
),
reading_questions(nomor_soal, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, kunci_jawaban) as (
  values
    ('1', 'The author refers to the ocean bottom as a "frontier" in line 2 because it', 'is not a popular area for scientific research', 'contains a wide variety of life forms', 'attracts courageous explorers', 'is an unknown territory', 'D'),
    ('2', 'The word "inaccessible" in line 3 is closest in meaning to', 'unrecognizable', 'unreachable', 'unusable', 'unsafe', 'B'),
    ('3', 'The author mentions outer space in line 7 because', 'the Earth''s climate millions of years ago was similar to conditions in outer space', 'it is similar to the ocean floor in being alien to the human environment', 'rock formations in outer space are similar to those found on the ocean floor', 'techniques used by scientists to explore outer space were similar to those used in ocean exploration', 'B'),
    ('4', 'Which of the following is true of the Glomar Challenger?', 'It is a type of submarine.', 'It is an ongoing project.', 'It has gone on over 100 voyages.', 'It made its first DSDP voyage in 1968.', 'D'),
    ('5', 'The word "extracting" in line 13 is closest in meaning to', 'breaking', 'locating', 'removing', 'analyzing', 'C'),
    ('6', 'The Deep Sea Drilling Project was significant because it was', 'an attempt to find new sources of oil and gas', 'the first extensive exploration of the ocean bottom', 'composed of geologists from all over the world', 'funded entirely by the gas and oil industry', 'B'),
    ('7', 'The word "strength" in line 21 is closest in meaning to', 'basis', 'purpose', 'discovery', 'endurance', 'A'),
    ('8', 'The word "they" in line 26 refers to', 'years', 'climates', 'sediments', 'cores', 'C'),
    ('9', 'Which of the following is NOT mentioned in the passage as being a result of the Deep Sea Drilling Project?', 'Geologists were able to determine the Earth''s appearance hundreds of millions of years ago.', 'Two geological theories became more widely accepted by scientists.', 'Information was revealed about the Earth''s past climatic changes.', 'Geologists observed forms of marine life never before seen.', 'D'),
    ('10', 'What does the passage mainly discuss?', 'Educational changes in Canadian society', 'Canada during the Second World War', 'Population trends in postwar Canada', 'Standards of living in Canada', 'C'),
    ('11', 'According to the passage, when did Canada''s baby boom begin?', 'In the decade after 1911', 'After 1945', 'During the depression of the 1930''s', 'In 1966', 'B'),
    ('12', 'The word "five" in line 3 refers to', 'Canadians', 'years', 'decades', 'marriages', 'A'),
    ('13', 'The word "surging" in line 4 is closest in meaning to', 'new', 'extra', 'accelerating', 'surprising', 'C'),
    ('14', 'The author suggests that in Canada during the 1950''s', 'the urban population decreased rapidly', 'fewer people married', 'economic conditions were poor', 'the birth rate was very high', 'D'),
    ('15', 'The word "trend" in line 11 is closest in meaning to', 'tendency', 'aim', 'growth', 'directive', 'A'),
    ('16', 'The word "peak" in line 14 is closest in meaning to', 'pointed', 'dismal', 'mountain', 'maximum', 'D'),
    ('17', 'When was the birth rate in Canada at its lowest postwar level?', '1966', '1957', '1956', '1951', 'A'),
    ('18', 'The author mentions all of the following as causes of declines in population growth after 1957 EXCEPT', 'people being better educated', 'people getting married earlier', 'better standards of living', 'couples buying houses', 'B'),
    ('19', 'It can be inferred from the passage that before the Industrial Revolution', 'families were larger', 'population statistics were unreliable', 'the population grew steadily', 'economic conditions were bad', 'A'),
    ('20', 'The word "It" in line 25 refers to', 'horizon', 'population wave', 'nine percent', 'first half', 'B'),
    ('21', 'The phrase "prior to" in line 26 is closest in meaning to', 'behind', 'since', 'during', 'preceding', 'D'),
    ('22', 'The word "Advocates" in line 3 is closest in meaning to which of the following?', 'Proponents', 'Merchants', 'Inspectors', 'Consumers', 'A'),
    ('23', 'In line 4, the word "others" refers to', 'advantages', 'advocates', 'organic foods', 'products', 'D'),
    ('24', 'The "welcome development" mentioned in line 6 is an increase in', 'interest in food safety and nutrition among North Americans', 'the nutritional quality of the typical North American diet', 'the amount of healthy food grown in North America', 'the number of consumers in North America', 'A'),
    ('25', 'According to the first paragraph, which of the following is true about the term "organic foods"?', 'It is accepted by most nutritionists.', 'It has been used only in recent years.', 'It has no fixed meaning.', 'It is seldom used by consumers.', 'C'),
    ('26', 'The word "unsubstantiated" in line 15 is closest in meaning to', 'unbelievable', 'uncontested', 'unpopular', 'unverified', 'D'),
    ('27', 'The word "maintain" in line 20 is closest in meaning to', 'improve', 'monitor', 'preserve', 'restore', 'C'),
    ('28', 'The author implies that there is cause for concern if consumers with limited incomes buy organic foods instead of conventionally grown foods because', 'organic foods can be more expensive but are often no better than conventionally grown foods', 'many organic foods are actually less nutritious than similar conventionally grown foods', 'conventionally grown foods are more readily available than organic foods', 'too many farmers will stop using conventional methods to grow food crops', 'A'),
    ('29', 'According to the last paragraph, consumers who believe that organic foods are better than conventionally grown foods are often', 'careless', 'mistaken', 'thrifty', 'wealthy', 'B'),
    ('30', 'What is the author''s attitude toward the claims made by advocates of health foods?', 'Very enthusiastic', 'Somewhat favorable', 'Neutral', 'Skeptical', 'D'),
    ('31', 'What does the passage mainly discuss?', 'The origins of theater', 'The role of ritual in modern dance', 'The importance of storytelling', 'The variety of early religious activities', 'A'),
    ('32', 'The word "they" in line 4 refers to', 'seasonal changes', 'natural forces', 'theories', 'human beings', 'D'),
    ('33', 'What aspect of drama does the author discuss in the first paragraph?', 'The reason drama is often unpredictable', 'The seasons in which dramas were performed', 'The connection between myths and dramatic plots', 'The importance of costumes in early drama', 'C'),
    ('34', 'Which of the following is NOT mentioned as a common element of theater and ritual?', 'Dance', 'Costumes', 'Music', 'Magic', 'D'),
    ('35', 'The word "considerable" in line 15 is closest in meaning to', 'thoughtful', 'substantial', 'relational', 'ceremonial', 'B'),
    ('36', 'The word "enactment" in line 15 is closest in meaning to', 'establishment', 'performance', 'authorization', 'season', 'B'),
    ('37', 'The word "they" in line 16 refers to', 'mistakes', 'costumes', 'animals', 'performers', 'D'),
    ('38', 'According to the passage, what is the main difference between ritual and drama?', 'Ritual uses music whereas drama does not.', 'Ritual is shorter than drama.', 'Ritual requires fewer performers than drama.', 'Ritual has a religious purpose and drama does not.', 'D'),
    ('39', 'The passage supports which of the following statements?', 'No one really knows how the theater began.', 'Myths are no longer represented dramatically.', 'Storytelling is an important part of dance.', 'Dramatic activities require the use of costumes.', 'A'),
    ('40', 'Where in the passage does the author discuss the separation of the stage and the audience?', 'Lines 8-9', 'Lines 12-14', 'Lines 19-20', 'Lines 22-24', 'B'),
    ('41', 'What does the passage mainly discuss?', 'Wartime expenditures', 'Problems facing the United States after the war', 'Methods of repairing the damage caused by the war', 'The results of government efforts to revive the economy', 'B'),
    ('42', 'The word "Staggering" in line 1 is closest in meaning to', 'specialized', 'confusing', 'various', 'overwhelming', 'D'),
    ('43', 'The word "devastated" in line 3 is closest in meaning to', 'developing', 'ruined', 'complicated', 'fragile', 'B'),
    ('44', 'According to the passage, which of the following statements about the damage in the South is correct?', 'It was worse than in the North.', 'The cost was less than expected.', 'It was centered in the border states.', 'It was remedied rather quickly.', 'A'),
    ('45', 'The passage refers to all of the following as necessary steps following the Civil War EXCEPT', 'helping soldiers readjust', 'restructuring industry', 'returning government to normal', 'increasing taxes', 'D'),
    ('46', 'The word "task" in line 15 refers to', 'raising the tax level', 'sensible financial choices', 'wise decisions about former slaves', 'reconstruction of damaged areas', 'D'),
    ('47', 'Why does the author mention a popular song in lines 22-23?', 'To give an example of a Northern attitude towards the South', 'To illustrate the Northern love of music', 'To emphasize the cultural differences between the North and the South', 'To compare the Northern and Southern presidents', 'A'),
    ('48', 'The word "them" in line 26 refers to', 'charges', 'leaders', 'days', 'irons', 'B'),
    ('49', 'Which of the following can be inferred from the phrase " ... it was unlikely that a jury from Virginia, a Southern Confederate state, would convict them" (lines 25-26) ?', 'Virginians felt betrayed by Jefferson Davis.', 'A popular song insulted Virginia.', 'Virginians were loyal to their leaders.', 'All of the Virginia military leaders had been put in chains.', 'C'),
    ('50', 'It can be inferred from the passage that President Johnson pardoned the Southern leaders in order to', 'raise money for the North', 'repair the physical damage in the South', 'prevent Northern leaders from punishing more Southerners', 'help the nation recover from the war', 'D')
)
insert into public.soal (
  package_code, section, nomor_soal, part, audio_url,
  passage_title, passage_text, pertanyaan,
  pilihan_a, pilihan_b, pilihan_c, pilihan_d, kunci_jawaban
)
select
  'model_a', 'reading', q.nomor_soal::integer, 'Reading', null,
  p.title, p.passage_text, q.pertanyaan,
  q.pilihan_a, q.pilihan_b, q.pilihan_c, q.pilihan_d, q.kunci_jawaban
from reading_questions q
join passages p on q.nomor_soal::integer between p.first_question::integer and p.last_question::integer
order by q.nomor_soal::integer;

do $$
declare
  v_listening integer;
  v_structure integer;
  v_reading integer;
begin
  select count(*) filter (where section = 'listening'),
         count(*) filter (where section = 'structure'),
         count(*) filter (where section = 'reading')
  into v_listening, v_structure, v_reading
  from public.soal
  where package_code = 'model_a';

  if v_listening <> 50 or v_structure <> 40 or v_reading <> 50 then
    raise exception 'Paket Model A tidak lengkap: Listening %, Structure %, Reading %',
      v_listening, v_structure, v_reading;
  end if;
end;
$$;

commit;
